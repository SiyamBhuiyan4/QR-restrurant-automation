import sceneryUrl from '../assets/backgrounds/swiss-lake-town.webp';
import '../styles/scenery-bg.css';

/**
 * SceneryBackground: a lakeside Swiss town (covered bridge, mountains, flowers) behind the
 * customer menu.
 *
 * The photo always covers the whole screen. Tall screens (phones) show the full 1080x1920
 * portrait; wide screens show a landscape slice of it. To give computers their own wide
 * picture, add a 1920x1080 file and list it in the <source> below.
 * Fixed on its own GPU layer, so scrolling never repaints it.
 */
export default function SceneryBackground() {
  return (
    <div className="scenery-bg" aria-hidden="true">
      <picture>
        <img
          className="scenery-bg__img"
          src={sceneryUrl}
          width="1080"
          height="1920"
          alt=""
          decoding="async"
          fetchpriority="high"
        />
      </picture>
      <div className="scenery-bg__shade" />
    </div>
  );
}
