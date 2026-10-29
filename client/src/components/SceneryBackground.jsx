import sceneryUrl from '../assets/backgrounds/swiss-lake-town.webp';
import sceneryBlurUrl from '../assets/backgrounds/swiss-lake-town-blur.webp';
import '../styles/scenery-bg.css';

/**
 * SceneryBackground: a lakeside Swiss town (covered bridge, mountains, flowers) behind the
 * customer menu.
 *
 * The whole 1080x1920 photo is always shown, never cropped: it sits at full height in the
 * middle of the screen, and the space beside it (wide screens) or above/below it (tall phones)
 * is filled with a soft blurred copy of the same photo. Fixed on its own GPU layer, so
 * scrolling never repaints it.
 */
export default function SceneryBackground() {
  return (
    <div className="scenery-bg" aria-hidden="true">
      <div className="scenery-bg__fill" style={{ backgroundImage: `url(${sceneryBlurUrl})` }} />
      <img
        className="scenery-bg__img"
        src={sceneryUrl}
        width="1080"
        height="1920"
        alt=""
        decoding="async"
        fetchpriority="high"
      />
      <div className="scenery-bg__shade" />
    </div>
  );
}
