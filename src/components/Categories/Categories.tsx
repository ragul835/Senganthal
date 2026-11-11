function Categories() {
  const categories = [
    "Women",
    "Men",
    "Kids",
    "Accessories"
  ];

  return (
    <section>
      <h2>Categories</h2>

      <div>
        {categories.map(category => (
          <button key={category}>
            {category}
          </button>
        ))}
      </div>
    </section>
  );
}

export default Categories;