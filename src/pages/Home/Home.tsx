import Header from "../../components/Header/Header";
import Hero from "../../components/Hero/Hero";
import Categories from "../../components/Categories/Categories";
import FeaturedProducts from "../../components/FeaturedProducts/FeaturedProducts";
import Footer from "../../components/Footer/Footer";
import "./Home.css";

function Home() {
  return (
    <>
      <Header />
      <main className="page-content">
        <Hero />
        <Categories />
        <FeaturedProducts />
      </main>
      <Footer />
    </>
  );
}

export default Home;