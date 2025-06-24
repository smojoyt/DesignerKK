window.updateCartCount = function () {
    const cart = JSON.parse(localStorage.getItem("savedCart")) || [];
    const totalQty = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    const countElem = document.getElementById("cart-count");
    if (countElem) {
        countElem.textContent = totalQty;
    }
};



function addToCart(product, variant) {
    const cart = JSON.parse(localStorage.getItem("savedCart")) || [];

    const existing = cart.find(item => item.id === product.product_id && item.variant === variant);
    const price = product.sale_price !== undefined ? product.sale_price : product.price;

    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({
            id: product.product_id,
            name: product.name,
            variant: variant || null,
            price: price,
            qty: 1,
            image: product.variantImages?.[variant] || product.image
        });
    }

    localStorage.setItem("savedCart", JSON.stringify(cart));
    updateCartCount();
    renderCart();
    toggleCart(true);
}


function renderAllColorDots(customOptions, variantStock = {}) {
    return customOptions
        .split("|")
        .map(color => {
            const trimmed = color.trim();
            const inStock = (variantStock[trimmed] ?? 0) > 0;
            return `
                <div class="relative w-6 h-6 rounded-full border border-gray-300 ${!inStock ? 'opacity-40' : ''} ${getColorClass ? getColorClass(trimmed) : ''}">
                  ${!inStock ? `
                    <span class="absolute inset-0 flex items-center justify-center">
                      <span class="w-full h-[2px] bg-red-600 rotate-45 absolute"></span>
                      <span class="w-full h-[2px] bg-red-600 -rotate-45 absolute"></span>
                    </span>` : ""}
                </div>
            `;
        })
        .join("");
}

function loadProductData() {
    Promise.all([
        fetch("/products/products.json").then(res => res.json()),
        fetch("/products/promotion.json").then(res => res.json())
    ])
        .then(([products, promotionsFile]) => {
            const promotions = promotionsFile.promotions || [];

            products = applyPromotionsToProducts(products, promotions);

            activeProduct = products[skuFromURL];
            if (!activeProduct) {
                console.error(`Product not found for SKU: ${skuFromURL}`);
                return;
            }

            const nameEl = document.getElementById("product-name");
            if (nameEl) nameEl.textContent = activeProduct.name;

            const productIdEl = document.getElementById("product-id");
            if (productIdEl && activeProduct.product_id) {
                productIdEl.textContent = activeProduct.product_id;
            }

            const priceSection = document.getElementById("price-section");
            if (priceSection) {
                priceSection.innerHTML = getFullPriceHTML(activeProduct);
            }

            const descEl = document.getElementById("product-description");
            if (descEl) {
                descEl.innerHTML = Array.isArray(activeProduct.descriptionList)
                    ? activeProduct.descriptionList.map(d => `<li>${d}</li>`).join("")
                    : `<li>${activeProduct.description}</li>`;
            }

            // Expandable helper
            function setupExpandable(sectionId, listData) {
                const section = document.getElementById(`${sectionId}Section`);
                const listEl = document.getElementById(`product-${sectionId}`);
                if (Array.isArray(listData) && listData.length > 0 && section && listEl) {
                    section.classList.remove("hidden");
                    listEl.innerHTML = listData
                        .map(item => `<li class="transition-all duration-300 opacity-0 translate-y-2">${item}</li>`)
                        .join('');

                }
            }


            // Dynamic expandable sections
            setupExpandable("sizing", activeProduct.sizingList);
            setupExpandable("keyDetails", activeProduct.keyDetails);
            setupExpandable("careInstructions", activeProduct.careInstructions);

            // Enable toggle behavior for expandable sections
            document.querySelectorAll(".toggle-expand").forEach(btn => {
                btn.addEventListener("click", () => {
                    const content = btn.nextElementSibling;
                    const icon = btn.querySelector(".expand-icon");
                    const isCollapsed = content.classList.contains("max-h-0");

                    // Toggle height and icon
                    content.classList.toggle("max-h-0", !isCollapsed);
                    content.classList.toggle("max-h-[500px]", isCollapsed);
                    icon.classList.toggle("rotate-180", isCollapsed);

                    // Animate li items when expanding
                    if (isCollapsed) {
                        const listItems = content.querySelectorAll("li");
                        listItems.forEach((li, i) => {
                            li.style.transitionDelay = `${i * 50}ms`;
                            li.classList.remove("opacity-0", "translate-y-2");
                            li.classList.add("opacity-100", "translate-y-0");
                        });
                    }
                });
            });



            const imgEl = document.getElementById("mainImage");
            const variantStock = activeProduct.variantStock || {};
            const defaultVariant = Object.keys(variantStock).find(c => variantStock[c] > 0);

            // Check for mainImage first, fallback to the second thumbnail if mainImage is missing
            const defaultImg = activeProduct.mainImage?.[0] || activeProduct.thumbnails?.[1] || activeProduct.image;

            if (imgEl) {
                imgEl.src = defaultImg;
                imgEl.alt = activeProduct.name;
            }

            const variantSelect = document.getElementById("variant-select");
            if (variantSelect && activeProduct.custom1Options) {
                variantSelect.innerHTML = "";
                const options = activeProduct.custom1Options.split("|").map(opt => opt.trim());
                let defaultSelected = false;

                options.forEach(color => {
                    const stock = variantStock[color] ?? 0;
                    const isOut = stock <= 0;

                    const swatch = document.createElement("button");
                    swatch.className = `
        flex flex-col items-center group
        focus:outline-none
        ${isOut ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
    `;
                    swatch.disabled = isOut;

                    swatch.innerHTML = ` 
        <div class="relative w-8 h-8 rounded-full border-2 border-gray-300 group-hover:border-black overflow-hidden ${getColorClass ? getColorClass(color) : ''}">
            ${isOut ? ` 
                <span class="absolute inset-0 bg-white/40 z-10"></span>
                <span class="absolute inset-0 flex items-center justify-center z-20">
                    <span class="w-full h-[2px] bg-red-600 rotate-45 absolute"></span>
                    <span class="w-full h-[2px] bg-red-600 -rotate-45 absolute"></span>
                </span>
            ` : ""}
        </div>
        <span class="text-xs mt-1 text-gray-700 group-hover:text-black">${color}</span>
    `;

                    swatch.setAttribute("aria-label", `${color} color`);

                    if (!isOut) {
                        swatch.addEventListener("click", () => {
                            updateVariant(color);

                            Array.from(variantSelect.children).forEach(btn =>
                                btn.querySelector("div").classList.remove("ring", "ring-black", "ring-offset-2")
                            );
                            swatch.querySelector("div").classList.add("ring", "ring-black", "ring-offset-2");

                            const img = document.getElementById("mainImage");
                            if (activeProduct.variantImages?.[color] && img) {
                                img.src = activeProduct.variantImages[color];
                            }

                            const variantInput = document.getElementById("variantSelector");
                            if (variantInput) variantInput.value = color;

                            const btn = document.getElementById("add-to-cart-btn");
                            if (btn) {
                                btn.disabled = false;
                                btn.textContent = "Add to Cart";
                                btn.classList.remove("opacity-50", "cursor-not-allowed");
                            }
                        });

                        if (!defaultSelected) {
                            defaultSelected = true;
                            setTimeout(() => swatch.click(), 0);
                        }
                    }

                    variantSelect.appendChild(swatch);
                });

                if (!defaultSelected) {
                    const btn = document.getElementById("add-to-cart-btn");
                    if (btn) {
                        btn.disabled = true;
                        btn.textContent = "Out of Stock";
                        btn.classList.add("opacity-50", "cursor-not-allowed");
                    }
                    const buyBtn = document.getElementById("buyButton");
                    if (buyBtn) {
                        buyBtn.disabled = true;
                        buyBtn.textContent = "Out of Stock";
                        buyBtn.classList.add("opacity-50", "cursor-not-allowed");
                    }
                }
            }


            const thumbnailContainer = document.getElementById("thumbnailContainer");
            if (thumbnailContainer && Array.isArray(activeProduct.thumbnails)) {
                thumbnailContainer.innerHTML = "";

                activeProduct.thumbnails.forEach((img, i) => {
                    const cell = document.createElement("div");
                    cell.className = "carousel-cell w-[100px] flex-shrink-0";

                    const thumb = document.createElement("img");
                    thumb.src = img;
                    thumb.alt = `${activeProduct.name} thumbnail ${i + 1}`;
                    thumb.className = "w-16 h-16 object-contain rounded-lg cursor-pointer";
                    thumb.onclick = () => swapImage(img);

                    cell.appendChild(thumb);
                    thumbnailContainer.appendChild(cell);
                });

                imagesLoaded(thumbnailContainer, () => {
                    const flickity = new Flickity(thumbnailContainer, {
                        cellAlign: 'left',
                        contain: true,
                        groupCells: false,
                        freeScroll: true,
                        wrapAround: false,
                        prevNextButtons: false,
                        pageDots: false,
                        dragThreshold: 3
                    });
                    flickity.resize();
                });
            }

            const loader = document.getElementById('loader');
            if (loader) loader.style.display = 'none';

            const content = document.getElementById('pageContent');
            if (content) content.classList.remove('hidden');

            
        });
}




