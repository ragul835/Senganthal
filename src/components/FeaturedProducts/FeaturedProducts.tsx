import { DEFAULT_PRODUCTS } from "../../config/constants";

function FeaturedProducts() {
  const products = DEFAULT_PRODUCTS;

  return (
    <section>
      <h2>Featured Products</h2>

      <div>
        {products.map((product) => (
          <div key={product}>
            <h3>{product}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}

export default FeaturedProducts;