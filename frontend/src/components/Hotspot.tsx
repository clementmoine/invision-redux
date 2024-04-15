import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  useCallback,
  useMemo,
  AnchorHTMLAttributes,
  CSSProperties,
} from 'react';

import {
  eventTypes,
  overlayPositionOptionsByTitle,
  targetTypes,
} from '@/constants/hotspots';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HotspotWithMetadata, EventTypes, Screen } from '@/types';

interface HotspotProps {
  hotspot: HotspotWithMetadata;
  visible: boolean;
  zoomLevel: number;
  screens?: Screen[];
  onTrigger?: (id: HotspotWithMetadata['id']) => void;
}

const Hotspot: React.FC<HotspotProps> = props => {
  const { hotspot, visible, onTrigger, screens, zoomLevel } = props;

  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // TODO: Check if it works
  const navigateToAdjacentScreen = useCallback(
    (direction: 'previous' | 'next') => {
      if (screens) {
        const currentIndex = screens.findIndex(
          screen => screen.id === hotspot.screenID,
        );

        if (currentIndex !== -1) {
          let adjacentIndex: number;

          if (direction === 'previous') {
            adjacentIndex = currentIndex - 1;
          } else {
            adjacentIndex = currentIndex + 1;
          }

          if (adjacentIndex >= 0 && adjacentIndex < screens.length) {
            const adjacentScreenID = screens[adjacentIndex].id;
            navigate(`/projects/${params.projectId}/${adjacentScreenID}`);
          }
        }
      }
    },
    [params, navigate, hotspot, screens],
  );

  // TODO: Check if it works
  const smoothScrollTo = useCallback(
    (scrollOffset: number, isSmoothScroll: boolean) => {
      const screenPreview = document.getElementById('screen-preview');

      if (screenPreview) {
        screenPreview.scrollTo({
          top: scrollOffset,
          behavior: isSmoothScroll ? 'smooth' : 'instant',
        });
      }
    },
    [],
  );

  const onHotspotEvent = useCallback(() => {
    if (hotspot.targetTypeID === targetTypes.screen) {
      navigate(`/projects/${params.projectId}/${hotspot.targetScreenID}`, {
        state: {
          previousScreenId: params.screenId,
        },
      });
    } else if (hotspot.targetTypeID === targetTypes.lastScreenVisited) {
      // Navigates back to the last visited screen
      // TODO: Check if a go back then a click on another go back on the previousScreen gets back to this screen
      if (location.state.previousScreenId) {
        navigate(
          `/projects/${params.projectId}/${location.state.previousScreenId}`,
          {
            state: {
              previousScreenId: params.screenId,
            },
          },
        );
      }
    } else if (hotspot.targetTypeID === targetTypes.previousScreenInSort) {
      // Navigates to the previous screen
      navigateToAdjacentScreen('previous');
    } else if (hotspot.targetTypeID === targetTypes.nextScreenInSort) {
      // Navigates to the next screen
      navigateToAdjacentScreen('next');
    } else if (hotspot.targetTypeID === targetTypes.externalUrl) {
      // Open an url in a new tab
      const { metaData } = hotspot as HotspotWithMetadata<'externalUrl'>;
      window.open(metaData.url, '_blank', 'noopener,noreferrer,nofollow');
    } else if (hotspot.targetTypeID === targetTypes.positionOnScreen) {
      // Scroll to a position on this screen
      const { metaData } = hotspot as HotspotWithMetadata<'positionOnScreen'>;
      smoothScrollTo(metaData.scrollOffset, metaData.isSmoothScroll);
    } else if (hotspot.targetTypeID === targetTypes.screenOverlay) {
      // Handle screen overlay
      // Example: Show a modal or overlay on the screen
    } else {
      alert('Unhandled target type');
    }
  }, [
    params,
    navigate,
    hotspot,
    navigateToAdjacentScreen,
    location,
    smoothScrollTo,
  ]);

  const handleHotspotEvent = useCallback(() => {
    onTrigger?.(hotspot.id);
    onHotspotEvent();
  }, [hotspot, onHotspotEvent, onTrigger]);

  const eventProps = useMemo(() => {
    const eventPerType: Record<
      EventTypes,
      keyof AnchorHTMLAttributes<HTMLAnchorElement> | null
    > = {
      click: 'onClick',
      doubleTap: 'onDoubleClick',
      pressHold: null,
      swipeRight: null,
      swipeLeft: null,
      swipeUp: null,
      swipeDown: null,
      hover: null,
      timer: null,
    };

    const eventType = (
      Object.keys(eventTypes) as (keyof typeof eventTypes)[]
    ).find(key => eventTypes[key] === hotspot.eventTypeID);

    if (eventType) {
      const eventName = eventPerType[eventType];
      if (eventName) {
        return {
          [eventName]: handleHotspotEvent,
        };
      }
    }
    return {};
  }, [hotspot.eventTypeID, handleHotspotEvent]);

  const Element = useMemo(() => {
    // Common className and style for the hotspot
    const className =
      'absolute border-blue-400 bg-blue-400/50 border-2 z-20 transition-opacity duration-500';

    const style: CSSProperties = {
      height: hotspot.height / zoomLevel,
      width: hotspot.width / zoomLevel,
      top: hotspot.y / zoomLevel,
      left: hotspot.x / zoomLevel,
      opacity: visible ? 1 : 0,
    };

    // Tooltip / Popover
    if (hotspot.targetTypeID === targetTypes.screenOverlay) {
      const overlayScreen = screens?.find(
        screen => screen.id === hotspot.targetScreenID,
      );

      if (!overlayScreen) {
        return null;
      }

      const { metaData } = hotspot as HotspotWithMetadata<'screenOverlay'>;

      const isHover = hotspot.eventTypeID === eventTypes.hover;

      const Container = isHover ? Tooltip : Popover;
      const Trigger = isHover ? TooltipTrigger : PopoverTrigger;
      const Content = isHover ? TooltipContent : PopoverContent;

      // "center" | "end" | "start"
      let align: 'center' | 'end' | 'start' | undefined = 'start';
      // "top" | "right" | "bottom" | "left"
      let side: 'top' | 'right' | 'bottom' | 'left' | undefined = 'top';

      // Set the alignOffset to origin
      const alignOffset =
        -hotspot.x / zoomLevel + metaData.overlay.positionOffset.x;
      const sideOffset =
        hotspot.y / zoomLevel -
        overlayScreen.height / 2 -
        metaData.overlay.positionOffset.y;

      // "Custom" | "Centered" | "Top Left" | "Top Center" | "Top Right" | "Bottom Left" | "Bottom Center" | "Bottom Right"
      if (
        metaData.overlay.positionID === overlayPositionOptionsByTitle.Centered
      ) {
        side = 'top';
        align = 'center';
      } else if (
        metaData.overlay.positionID ===
        overlayPositionOptionsByTitle['Top Left']
      ) {
        side = 'top';
        align = 'start';
      } else if (
        metaData.overlay.positionID ===
        overlayPositionOptionsByTitle['Top Center']
      ) {
        side = 'top';
        align = 'center';
      } else if (
        metaData.overlay.positionID ===
        overlayPositionOptionsByTitle['Top Right']
      ) {
        side = 'top';
        align = 'end';
      } else if (
        metaData.overlay.positionID ===
        overlayPositionOptionsByTitle['Bottom Left']
      ) {
        side = 'bottom';
        align = 'start';
      } else if (
        metaData.overlay.positionID ===
        overlayPositionOptionsByTitle['Bottom Center']
      ) {
        side = 'bottom';
        align = 'center';
      } else if (
        metaData.overlay.positionID ===
        overlayPositionOptionsByTitle['Bottom Right']
      ) {
        side = 'bottom';
        align = 'end';
      }

      return (
        <Container>
          <Trigger
            id={hotspot.id.toString()}
            className={className}
            style={style}
          />

          <Content
            side={side}
            avoidCollisions={false}
            sideOffset={sideOffset}
            align={align}
            alignOffset={alignOffset}
            data-hotspot-x={hotspot.x / zoomLevel}
            data-hotspot-y={hotspot.y / zoomLevel}
            style={{ ['--radix-popover-content-transform-origin']: '0 0' }}
            className="bg-transparent m-0 p-0 shadow-none border-none rounded-none"
          >
            <img
              src={`/api/static/${overlayScreen.imageUrl}`}
              style={{
                width: overlayScreen.width / zoomLevel,
                height: overlayScreen.height / zoomLevel,
                aspectRatio: `${overlayScreen.width / zoomLevel} / ${overlayScreen.height / zoomLevel}`,
              }}
            />
          </Content>
        </Container>
      );
    } else {
      // Common case (click, double click ...)
      return (
        <button
          id={hotspot.id.toString()}
          role="button"
          {...eventProps}
          className={className}
          style={style}
        ></button>
      );
    }
  }, [hotspot, zoomLevel, screens, eventProps, visible]);

  return Element;
};

export default Hotspot;