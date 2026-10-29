import sceneryUrl from '../assets/backgrounds/swiss-lake-town.webp';
import '../styles/scenery-bg.css';

/**
 * SceneryBackground: a lakeside Swiss town (covered bridge, mountains, flowers) behind the
 * customer menu.
 *
 * A still 1080x1920 photo, cropped to fit any screen (the town and bridge stay in view), with
 * a soft shade on top so menu text reads well. Fixed on its own GPU layer, so scrolling never
 * repaints it.
 */
export default function SceneryBackground() {
  return (
    <div className="scenery-bg" aria-hidden="true">
      <img className="scenery-bg__img" src={sceneryUrl} alt="" decoding="async" fetchpriority="high" />
      <div className="scenery-bg__shade" />
    </div>
  );
}
