function loadFeaturedProducts() {
    Promise.all([
        fetch("/products/products.json").then(res => res.json()),
        fetch("/products/promotion.json").then(res => res.json())
    ]).then(([products, promotionFile]) => {
        const container = document.getElementById("featured-products");
        if (!container) return;

        const now = new Date();
        const promotions = promotionFile.promotions || [];

        const featuredPromo = promotions.find(p => {
            const startOk = !p.startDate || new Date(p.startDate) <= now;
            const endOk = !p.endDate || new Date(p.endDate) >= now;
            return p.featured && startOk && endOk;
        }) || promotions.find(p => p.featured);

        if (!featuredPromo || !featuredPromo.category) return;

        const targetCategory = featuredPromo.category;

        const filteredProducts = Object.values(products)
            .filter(p => {
                if (p.category !== targetCategory) return false;
                const stock = p.variantStock || {};
                return Object.values(stock).some(qty => qty > 0);
            })
            .sort(() => 0.5 - Math.random())
            .slice(0, 6); // Max 6 for swiping

        // Responsive column classes
        const colClasses = {
            1: "md:grid-cols-1",
            2: "md:grid-cols-2",
            3: "md:grid-cols-3",
            4: "md:grid-cols-4",
            5: "md:grid-cols-5"
        };
        const gridCols = colClasses[Math.min(filteredProducts.length, 5)];

        // Apply updated class
        container.innerHTML = "";
        container.className = `flex overflow-x-auto gap-4 px-4 ml-4 scroll-snap-x snap-x snap-mandatory md:ml-0 md:grid ${gridCols} md:overflow-visible md:px-0 md:max-h-[9999px]`;

        // Update heading if available
        const title = document.getElementById("featured-title");
        if (title) {
            const cap = targetCategory.charAt(0).toUpperCase() + targetCategory.slice(1);
            title.textContent = `All New ${cap}`;
        }

        // Render cards
        filteredProducts.forEach(p => {
            const stock = p.variantStock || {};
            const inStockColors = Object.keys(stock).filter(variant => stock[variant] > 0);
            const swatchString = inStockColors.join("|");
            const secondThumbnail = p.thumbnails?.[1] || p.image;

            const originalPrice = p.price;
            let salePrice = originalPrice;
            if (featuredPromo.type === "percent") {
                salePrice = originalPrice * (1 - featuredPromo.amount / 100);
            } else if (featuredPromo.type === "fixed") {
                salePrice = Math.max(0, originalPrice - featuredPromo.amount);
            }

            const wrapper = document.createElement("div");
            wrapper.className = "mx-auto snap-start flex-shrink-0 w-[48%] sm:w-[45%] md:w-auto max-w-xs md:[&:nth-child(n+6)]:hidden";

            const card = document.createElement("a");
            card.href = p.url;
            card.className = "block overflow-hidden transition";

            card.innerHTML = `
                <div class="relative w-full bg-white rounded-xl">
                    <img src="${secondThumbnail}" alt="${p.name}" class="shadow hover:shadow-lg w-full object-contain rounded-xl">
                    ${inStockColors.length > 1 ? `
                        <div class="absolute bottom-2 left-2 flex gap-1">
                            ${renderColorDots(swatchString, p.variantStock)}
                        </div>` : ""}
                </div>
                <div class="mt-4 text-left">
                    <div class="text-base sm:text-lg md:text-xl font-bold text-gray-800 leading-snug break-words">${p.name}</div>
                    <div class="mt-1 text-lg font-bold text-green-700">
                        $${salePrice.toFixed(2)}
                        <span class="ml-2 text-gray-500 line-through text-base">$${originalPrice.toFixed(2)}</span>
                    </div>
                </div>
            `;

            wrapper.appendChild(card);
            container.appendChild(wrapper);
        });
    });
}