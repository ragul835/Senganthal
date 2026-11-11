import { HERO_TITLE, HERO_SUBTITLE } from "../../config/constants";

function Hero() {
  return (
    <section className="hero">
      <h1>{HERO_TITLE}</h1>

      <p>{HERO_SUBTITLE}</p>

      <button>Shop Now</button>
    </section>
  );
}

export default Hero;