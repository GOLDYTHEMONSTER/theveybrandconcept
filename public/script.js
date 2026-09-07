const products = [
  {
    id: 1,
    sku: 'VY-SIENNA-GOWN',
    name: 'The Sienna Gown',
    category: 'Dresses',
    price: 145000,
    description: 'A fluid evening silhouette with sculpted drape and a cinematic finish.',
    longDescription: `
      <p>The Sienna Gown is an editorial evening piece designed for modern red-carpet and private dinner events. Its sculptural construction is balanced by a soft drape that elegantly moves with every step, while a subtle sheen creates a tactile, couture feel.</p>
      <p>The gown is crafted to feel refined yet relaxed, with a structured bodice, hidden shaping, and a fluid skirt that maintains a vertical line without overwhelming movement. This piece is ideal for fashion-forward clients who want a dramatic silhouette delivered with luxurious ease.</p>
      <ul>
        <li>Premium stretch satin blend for luminous drape</li>
        <li>Structured V-neck bodice and couture-style seam details</li>
        <li>Full-length skirt with a soft train and hidden side slit</li>
        <li>Designed for evening, editorial, and luxury destination events</li>
      </ul>
    `,
    color: 'Champagne',
    colors: ['#d9c6a0', '#4b433b', '#000000'],
    sizes: ['XS', 'S', 'M', 'L'],
    image: 'product1/fashn-export-1786297249232.webp',
    aiViews: {
      front: 'product1/fashn-export-1786297249232.webp',
      side: 'product1/fashn-export-1786193085690.webp',
      back: 'product1/0d6b541c953ad00fd2967e69b791dc60e61b5662.webp',
    },
    video: 'product1/fashn-export-1786297223826.mp4',
  },
  {
    id: 2,
    sku: 'VY-ATELIER-SET',
    name: 'The Atelier Set',
    category: 'Sets',
    price: 98000,
    description: 'Soft tailoring with a premium lounge finish designed for evening plans.',
    color: 'Ivory',
    colors: ['#f2ebde', '#b18f60', '#202020'],
    sizes: ['S', 'M', 'L'],
    image: 'product2/fashn-export-1786299961980.webp',
    aiViews: {
      front: 'product2/fashn-export-1786299961980.webp',
      side: 'product2/fashn-export-1786300035818.webp',
      back: 'product2/8822279671f6c00c92f6e1f073b90e12b7936f2b.webp',
    },
    video: 'product2/fashn-export-1786300232150.mp4',
  },
  {
    id: 3,
    sku: 'VY-NOIR-MINI',
    name: 'The Noir Mini',
    category: 'Dresses',
    price: 62000,
    description: 'A sculpted cocktail dress that balances elegance and edge.',
    longDescription: `
      <p>The Noir Mini is built for after-dark confidence, combining a precise waistline with a fluid, body-skimming silhouette that moves cleanly from lounge to late-evening events. The dress is cut to feel elevated and relaxed at once, with calm structure that makes a polished statement without excess.</p>
      <p>This mini brings a luxe, modern attitude through its tailored shaping and subtle sheen, creating a sleek profile that still feels feminine and wearable. The finish is refined but intuitive, designed for dinners, gallery openings, and elevated city nights when the dress needs to work as hard as the mood.</p>
      <ul>
        <li>Soft structured bodice with minimal seam pressure</li>
        <li>Clean-lined mini length with a modern, sculpted drape</li>
        <li>Refined matte sheen for understated evening polish</li>
        <li>Perfect for cocktail occasions and statement-ready layering</li>
      </ul>
    `,
    color: 'Midnight',
    colors: ['#1c1c1c', '#ccb38b', '#8d6f4b'],
    sizes: ['XS', 'S', 'M', 'L'],
    image: 'product3/a025ab9385dadeb593946db6f70668ac1e237547.webp',
    aiViews: {
      front: 'product3/a025ab9385dadeb593946db6f70668ac1e237547.webp',
      side: 'product3/fashn-export-1786446685459.webp',
      back: 'product3/fashn-export-1786446780454.webp',
    },
    video: 'product3/fashn-export-1786446897296.mp4',
  },
  {
    id: 4,
    sku: 'VY-VELVET-SHIFT',
    name: 'The Velvet Shift',
    category: 'Tops',
    price: 54000,
    description: 'A polished shift with a rich velvet finish and quiet luxury simplicity.',
    longDescription: `
      <p>The Velvet Shift is a refined statement top designed around texture, proportion, and ease. Its rich velvet finish catches the light softly, offering a luxe feel without sacrificing the clean, architectural line that defines modern tailoring.</p>
      <p>Built with a relaxed drape and a precise neckline, the design balances comfort with intention. It sits effortlessly on the body and can be styled for layered evening wear, office transitions, or elevated weekend dressing with minimal effort.</p>
      <ul>
        <li>Velvet-touch finish with an elegant, low-sheen depth</li>
        <li>Structured neckline and graceful shift silhouette</li>
        <li>Soft body movement with a polished, elevated fall</li>
        <li>Designed for elevated layering and refined day-to-night styling</li>
      </ul>
    `,
    color: 'Rosewood',
    colors: ['#6e4d3d', '#f4e2c8', '#1a1a1a'],
    sizes: ['S', 'M', 'L', 'XL'],
    image: 'product4/9ff8a662b150b5824caf960e2decde085a087038.webp',
    aiViews: {
      front: 'product4/9ff8a662b150b5824caf960e2decde085a087038.webp',
      side: 'product4/fashn-export-1786447149299.webp',
      back: 'product4/fashn-export-1786447226697.webp',
    },
    video: 'product4/omega_video_0.mp4',
  },
];

function formatPrice(amount) {
  return `₦${Number(amount || 0).toLocaleString('en-NG')}`;
}

/**
 * Pulls the live catalog (price + real stock) from the ERP backend and
 * merges it into the local `products` list by SKU. Products the backend
 * knows about but this file has no curated photography/copy for yet
 * (e.g. a brand-new piece just added in Inventory) are appended as
 * plain cards rather than skipped, so "create product" in the ERP
 * shows up here without a code change.
 */
async function syncCatalogFromBackend() {
  try {
    const response = await fetch('/api/storefront/products');
    if (!response.ok) return;
    const { products: remoteProducts } = await response.json();

    remoteProducts.forEach((remote) => {
      const local = products.find((product) => product.sku && product.sku === remote.sku);
      if (local) {
        local.price = remote.price;
        local.compareAtPrice = remote.compareAtPrice;
        local.available = remote.available;
        return;
      }

      products.push({
        id: remote.id,
        sku: remote.sku,
        name: remote.name,
        category: remote.category,
        price: remote.price,
        compareAtPrice: remote.compareAtPrice,
        available: remote.available,
        description: remote.description || 'New arrival from the workshop.',
        color: '',
        colors: [],
        sizes: [],
        image: remote.imageUrl || 'images/logo_orange_vibrant.png',
        aiViews: {
          front: remote.imageUrl || 'images/logo_orange_vibrant.png',
          side: remote.imageUrl || 'images/logo_orange_vibrant.png',
          back: remote.imageUrl || 'images/logo_orange_vibrant.png',
        },
        video: null,
      });
    });
  } catch (error) {
    // Static content still renders fine offline/without the backend.
    console.warn('Storefront could not sync live catalog data', error);
  }
}

const categories = ['All', 'Dresses', 'Tops', 'Sets', 'New'];
const stateKey = 'tbState';
let activeCategory = 'All';
let activeProduct = products[0];
let cartItems = [];
let activeView = 'front';

const filterRow = document.getElementById('filterRow');
const productGrid = document.getElementById('productGrid') || document.getElementById('shopGrid');
const productVisual = document.getElementById('productVisual');
const productTitle = document.getElementById('productTitle');
const productDescription = document.getElementById('productDescription');
const productLongDescription = document.getElementById('productLongDescription');
const productPrice = document.getElementById('productPrice');
const productCategory = document.getElementById('productCategory');
const productVideo = document.getElementById('productVideo');
const productVideoSource = document.getElementById('productVideoSource');
const swatches = document.getElementById('swatches');
const sizesEl = document.getElementById('sizes');
const verifyPanel = document.getElementById('verifyPanel');
const showroomTrigger = document.getElementById('showroomTrigger');
let showroomVideo = document.getElementById('showroomVideo');
let showroomVideoSource = document.getElementById('showroomVideoSource');
let showroomVideoNext = null;
const showroomCaptionTitle = document.getElementById('showroomCaptionTitle');
const showroomCaptionText = document.getElementById('showroomCaptionText');
const cartContent = document.getElementById('cartContent');
const cartDrawer = document.getElementById('cartDrawer');
const cartDrawerBackdrop = document.getElementById('cartDrawerBackdrop');
const splashScreen = document.getElementById('splashScreen');
const cartList = document.getElementById('cartList');
const subtotalEl = document.getElementById('subtotal');
const viewTabs = document.getElementById('viewTabs');
const verifyBtn = document.getElementById('verifyBtn');
const verifyHeroBtn = document.getElementById('verifyHeroBtn');
const addToBagBtn = document.getElementById('addToBagBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const enterStoreBtn = document.getElementById('enterStoreBtn');
const heroThumbs = document.getElementById('heroThumbs');
const cartCountEls = Array.from(document.querySelectorAll('#cartCount'));

let heroInterval = null;
let heroActiveIndex = 0;
let pageLoaderFallbackTimer = null;

function getHeroIntervalDelay() {
  return 3000 + Math.floor(Math.random() * 3001);
}

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem('tbCart') || '[]');
    cartItems = Array.isArray(stored) ? stored : [];
  } catch (error) {
    cartItems = [];
  }
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(stateKey) || '{}');
    if (stored.activeCategory) activeCategory = stored.activeCategory;
    if (stored.lastProductId) activeProduct = products.find((product) => product.id === Number(stored.lastProductId)) || activeProduct;
  } catch (error) {
    // ignore
  }
}

function saveState() {
  localStorage.setItem(stateKey, JSON.stringify({
    activeCategory,
    lastProductId: activeProduct?.id || products[0].id,
  }));
}

function saveCart() {
  localStorage.setItem('tbCart', JSON.stringify(cartItems));
}

function updateCartCounts() {
  cartCountEls.forEach((element) => {
    element.textContent = cartItems.length;
  });
}

function renderFilters() {
  if (!filterRow) return;
  filterRow.innerHTML = categories
    .map(
      (category) => `
        <button class="pill ${activeCategory === category ? 'active' : ''}" data-category="${category}">
          ${category}
        </button>
      `,
    )
    .join('');
}

function getVisibleProducts() {
  return products.filter((product) => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'New') return product.id === 1 || product.id === 4;
    return product.category === activeCategory;
  });
}

function isAuthorizedMedia(url) {
  return typeof url === 'string' && /^(product[1-3]|product4)\//.test(url);
}

function getHeroProducts() {
  return products.filter((product) => isAuthorizedMedia(product.image) && isAuthorizedMedia(product.video));
}

function renderProductsSkeletons() {
  if (!productGrid) return;
  productGrid.innerHTML = Array.from({ length: 6 }, (_, index) => `
    <article class="product-card skeleton-card" aria-hidden="true" data-index="${index}">
      <div class="skeleton-media" style="--card-ratio: ${MASONRY_RATIOS[index % MASONRY_RATIOS.length]};"></div>
      <div class="skeleton-row short"></div>
      <div class="skeleton-row"></div>
      <div class="skeleton-row tiny"></div>
    </article>
  `).join('');
}

function renderHeroSkeletons() {
  if (!heroThumbs) return;
  heroThumbs.innerHTML = Array.from({ length: 4 }, (_, index) => `
    <button class="hero-thumb skeleton-thumb" aria-hidden="true" data-index="${index}">
      <div class="skeleton-media thumb-media"></div>
      <span class="thumb-label skeleton-label"></span>
    </button>
  `).join('');
}

// Cycled per card so the grid reads as an organic Pinterest-style
// collage rather than a uniform 3-up grid — paired with CSS columns
// (see .product-grid) which lets each column flow independently.
const MASONRY_RATIOS = ['4 / 5', '1 / 1', '3 / 4', '5 / 7', '4 / 6', '5 / 6'];

function renderProducts() {
  if (!productGrid) return;
  const visibleProducts = getVisibleProducts();

  productGrid.innerHTML = visibleProducts
    .map((product, index) => {
      const soldOut = product.available === 0;
      const lowStock = !soldOut && typeof product.available === 'number' && product.available <= 5;
      const stockBadge = soldOut
        ? '<span class="product-card-stock out">Sold out</span>'
        : lowStock
          ? '<span class="product-card-stock low">Low stock</span>'
          : '';
      const ratio = MASONRY_RATIOS[index % MASONRY_RATIOS.length];

      return `
        <article class="product-card${soldOut ? ' is-sold-out' : ''}" data-id="${product.id}">
          <div class="product-card-media" style="--card-ratio: ${ratio};">
            ${stockBadge}
            <img src="${product.image}" alt="${product.name}" />
          </div>
          <div class="product-card-body">
            <p class="product-card-category">${product.category}</p>
            <h3 class="product-card-name">${product.name}</h3>
            <div class="product-card-price-row">
              <span class="product-card-price">${formatPrice(product.price)}</span>
              ${product.compareAtPrice ? `<span class="product-card-compare">${formatPrice(product.compareAtPrice)}</span>` : ''}
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderHeroCarousel(productsToShow = getHeroProducts()) {
  if (!heroThumbs) return;

  heroThumbs.innerHTML = productsToShow
    .map((product, index) => `
      <button class="hero-thumb ${heroActiveIndex === index ? 'active' : ''}" data-index="${index}" aria-label="Featured product ${product.name}">
        <img src="${product.image}" alt="${product.name}" />
        <span class="thumb-label">${product.name}</span>
      </button>
    `)
    .join('');
}

function setShowroomCaption(product, animate = true) {
  if (!product) return;
  if (showroomCaptionTitle) showroomCaptionTitle.textContent = product.name;
  if (showroomCaptionText) {
    const tone = product.category === 'Sets'
      ? 'Soft tailoring for city evenings.'
      : product.category === 'Tops'
        ? 'Clean silhouettes with a polished finish.'
        : 'Champagne satin silhouette for the evening edit.';
    showroomCaptionText.textContent = product.color ? `${product.color} ${product.category.toLowerCase()} finish.` : tone;
  }
  const caption = document.getElementById('showroomCaption');
  if (caption && animate) {
    caption.classList.remove('animate');
    void caption.offsetWidth;
    caption.classList.add('animate');
  }
}

function ensureShowroomStill() {
  const frame = showroomTrigger;
  if (!frame) return null;

  let still = frame.querySelector('.showroom-still');
  if (!still) {
    still = document.createElement('img');
    still.className = 'showroom-still';
    still.alt = '';
    still.setAttribute('aria-hidden', 'true');
    still.style.opacity = '1';
    still.style.zIndex = '2';
    frame.insertBefore(still, frame.firstChild);
  }

  return still;
}

function ensureShowroomSwapVideo() {
  const frame = showroomTrigger;
  if (!frame || !showroomVideo) return null;

  if (!showroomVideoNext) {
    showroomVideoNext = document.createElement('video');
    showroomVideoNext.id = 'showroomVideoNext';
    showroomVideoNext.className = 'showroom-video showroom-video-next';
    showroomVideoNext.muted = true;
    showroomVideoNext.loop = true;
    showroomVideoNext.playsInline = true;
    showroomVideoNext.preload = 'auto';
    showroomVideoNext.setAttribute('aria-hidden', 'true');
    showroomVideoNext.style.opacity = '0';
    showroomVideoNext.style.zIndex = '3';
    showroomVideoNext.style.pointerEvents = 'none';
    showroomVideoNext.style.transition = 'opacity 700ms ease';
    frame.appendChild(showroomVideoNext);
  }

  return showroomVideoNext;
}

function setShowroomMedia(product) {
  if (!product || !showroomVideo) return;

  const still = ensureShowroomStill();
  const nextVideo = ensureShowroomSwapVideo();
  if (!nextVideo) return;

  if (still) {
    still.src = product.image;
    still.style.opacity = '1';
    still.style.visibility = 'visible';
  }

  const currentVideo = showroomVideo;
  currentVideo.style.opacity = '1';
  currentVideo.style.zIndex = '2';
  nextVideo.style.opacity = '0';
  nextVideo.style.zIndex = '3';
  nextVideo.src = product.video;
  nextVideo.load();

  const swapWhenReady = () => {
    if (nextVideo.readyState < 4) {
      setTimeout(swapWhenReady, 150);
      return;
    }

    nextVideo.currentTime = 0;
    nextVideo.play().catch(() => {});
    currentVideo.pause();
    currentVideo.style.opacity = '0';
    nextVideo.style.opacity = '1';

    if (still) {
      still.style.opacity = '0';
      still.style.visibility = 'hidden';
    }

    showroomVideo = nextVideo;
    showroomVideoNext = null;
    setTimeout(() => {
      if (currentVideo !== showroomVideo) {
        currentVideo.pause();
        currentVideo.currentTime = 0;
      }
    }, 100);
  };

  nextVideo.onloadeddata = () => {
    if (nextVideo.readyState >= 4) {
      swapWhenReady();
      return;
    }
    nextVideo.oncanplaythrough = swapWhenReady;
  };

  nextVideo.onerror = () => {
    if (still) {
      still.style.opacity = '1';
      still.style.visibility = 'visible';
    }
    nextVideo.style.opacity = '0';
    currentVideo.style.opacity = '1';
  };

  setShowroomCaption(product, true);
}

function startShowroomVideo(product, productsToShow = getHeroProducts()) {
  if (!product) return;
  const heroProducts = productsToShow.length ? productsToShow : getHeroProducts();
  const startingIndex = heroProducts.findIndex((item) => item.id === product.id);
  heroActiveIndex = startingIndex >= 0 ? startingIndex : 0;
  renderHeroCarousel(heroProducts);
  setShowroomMedia(heroProducts[heroActiveIndex]);
}

function moveHeroCarousel(index, productsToShow = getHeroProducts()) {
  if (!productsToShow.length) return;
  heroActiveIndex = (index + productsToShow.length) % productsToShow.length;
  renderHeroCarousel(productsToShow);
  setShowroomMedia(productsToShow[heroActiveIndex]);
}

function startHeroCarousel(productsToShow = getHeroProducts()) {
  stopHeroCarousel();
  if (!productsToShow.length || !showroomVideo) return;

  heroInterval = setInterval(() => {
    const nextIndex = (heroActiveIndex + 1) % productsToShow.length;
    heroActiveIndex = nextIndex;
    renderHeroCarousel(productsToShow);
    setShowroomMedia(productsToShow[nextIndex]);
  }, 5200);
}

function stopHeroCarousel() {
  if (heroInterval) {
    clearInterval(heroInterval);
    heroInterval = null;
  }
}

function getProductFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const productId = Number(params.get('id'));
  return products.find((product) => product.id === productId) || products[0];
}

let aiPromptTimers = [];

function renderAiPromptStream(container, htmlString) {
  if (!container) return;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${htmlString || ''}</div>`, 'text/html');
  const blocks = Array.from(doc.body.querySelectorAll('p, li'))
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .slice(0, 6);

  aiPromptTimers.forEach((timer) => clearTimeout(timer));
  aiPromptTimers = [];

  container.innerHTML = `
    <details class="ai-summary-card" open>
      <summary>
        <span>Design notes</span>
        <span class="summary-pill">details</span>
      </summary>
      <div class="ai-summary-body">
        ${blocks.map(() => '<div class="ai-stream-line"><span class="ai-stream-text"></span></div>').join('') || '<div class="ai-stream-line"><span class="ai-stream-text">Loading design notes...</span></div>'}
      </div>
    </details>
  `;

  // Text renders immediately (nobody wants to wait for a paragraph to
  // "type out"); only the reveal — a quick staggered fade + rise — is
  // animated, so the copy is readable the instant each line appears.
  const streamLines = Array.from(container.querySelectorAll('.ai-stream-text'));
  streamLines.forEach((line, index) => {
    const text = blocks[index] || 'Generating visual context...';
    line.textContent = text;
    line.classList.add('complete');

    const revealTimer = setTimeout(() => {
      line.closest('.ai-stream-line')?.classList.add('revealed');
    }, 70 + index * 70);
    aiPromptTimers.push(revealTimer);
  });
}

function renderProductDetail(product) {
  if (!product) return;
  activeProduct = product;
  saveState();
  if (productVisual) {
    productVisual.innerHTML = `<img src="${product.aiViews[activeView]}" alt="${product.name} ${activeView} view" />`;
  }
  const hasMultipleViews = product.aiViews.front !== product.aiViews.side || product.aiViews.front !== product.aiViews.back;
  const gallery = document.getElementById('productGallery');
  if (gallery) {
    if (!hasMultipleViews) {
      gallery.innerHTML = '';
    } else {
      const galleryImages = [
        { view: 'front', src: product.aiViews.front },
        { view: 'side', src: product.aiViews.side },
        { view: 'back', src: product.aiViews.back },
      ];
      gallery.innerHTML = galleryImages
        .map(
          (item) => `
            <div class="gallery-thumb ${activeView === item.view ? 'active' : ''}" data-view="${item.view}">
              <img src="${item.src}" alt="${product.name} ${item.view} view" />
            </div>
          `,
        )
        .join('');
    }
  }
  if (viewTabs) viewTabs.style.display = hasMultipleViews ? '' : 'none';
  if (productTitle) productTitle.textContent = product.name;
  if (productDescription) productDescription.textContent = product.description;
  if (productPrice) productPrice.textContent = formatPrice(product.price);
  if (productCategory) productCategory.textContent = product.category;

  const soldOut = product.available === 0;
  const lowStock = !soldOut && typeof product.available === 'number' && product.available <= 5;
  if (addToBagBtn) {
    addToBagBtn.disabled = soldOut;
    addToBagBtn.textContent = soldOut ? 'Sold out' : 'Add to cart';
  }
  const stockNote = document.getElementById('productStockNote');
  if (stockNote) {
    stockNote.textContent = soldOut ? 'Currently sold out' : lowStock ? `Only ${product.available} left` : '';
    stockNote.style.display = soldOut || lowStock ? 'block' : 'none';
  }
  if (productLongDescription) {
    renderAiPromptStream(productLongDescription, product.longDescription || '');
  }
  if (productVideo && productVideoSource) {
    const selectedVideo = product.video;
    const selectedPoster = product.image;
    if (isAuthorizedMedia(selectedVideo) && isAuthorizedMedia(selectedPoster)) {
      productVideoSource.setAttribute('src', selectedVideo);
      productVideo.setAttribute('poster', selectedPoster);
      productVideo.removeAttribute('controls');
      productVideo.style.display = 'block';
      productVideo.style.width = '100%';
      productVideo.style.height = '100%';
      productVideo.style.objectFit = 'cover';
      productVideo.load();
      productVideo.muted = true;
      productVideo.play().catch(() => {
        /* autoplay blocked; keep video view-only */
      });
    } else {
      productVideoSource.setAttribute('src', '');
      productVideo.removeAttribute('poster');
      productVideo.style.display = 'none';
    }
  }
  if (swatches) {
    swatches.innerHTML = product.colors
      .map((color) => `<span class="swatch" style="background:${color};"></span>`)
      .join('');
  }
  if (sizesEl) {
    sizesEl.innerHTML = product.sizes
      .map((size) => `<span class="size-pill">${size}</span>`)
      .join('');
  }
}

function renderCartDrawer() {
  if (!cartContent) return;

  const subtotal = cartItems.reduce((value, item) => value + item.price, 0);

  if (!cartItems.length) {
    cartContent.innerHTML = `
      <div class="drawer-empty-state">
        <p class="empty-state">Your selected pieces will appear here.</p>
      </div>
    `;
    return;
  }

  const itemsMarkup = cartItems
    .map(
      (item) => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" />
          <div>
            <strong>${item.name}</strong>
            <p>${item.category}</p>
            <p>${formatPrice(item.price)}</p>
          </div>
        </div>
      `,
    )
    .join('');

  cartContent.innerHTML = `
    <div class="drawer-items">${itemsMarkup}</div>
    <div class="drawer-summary">
      <div class="summary-row">
        <span>Subtotal</span>
        <strong>${formatPrice(subtotal)}</strong>
      </div>
      <div class="summary-row">
        <span>Shipping</span>
        <strong>Calculated</strong>
      </div>
      <div class="summary-row">
        <span>Taxes</span>
        <strong>Included</strong>
      </div>
      <p class="summary-note">Secure boutique delivery with trusted luxury fulfilment.</p>
      <div class="payment-methods">
        <p class="small-label">Accepted methods</p>
        <div class="method-row">
          <span class="method-badge mastercard">MC</span>
          <span class="method-badge visa">VISA</span>
          <span class="method-badge paypal">PayPal</span>
          <span class="method-badge apple">Apple</span>
        </div>
      </div>
      <div class="drawer-actions">
        <a class="primary-btn" href="checkout.html">Continue to checkout</a>
      </div>
    </div>
  `;
}

function renderCartPage() {
  if (!cartList || !subtotalEl) return;
  if (!cartItems.length) {
    cartList.innerHTML = '<p class="empty-state">Your selected pieces will appear here.</p>';
    subtotalEl.textContent = '$0';
    return;
  }

  const subtotal = cartItems.reduce((value, item) => value + item.price, 0);
  cartList.innerHTML = cartItems
    .map(
      (item) => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" />
          <div>
            <strong>${item.name}</strong>
            <p>${item.category}</p>
            <p>${formatPrice(item.price)}</p>
          </div>
        </div>
      `,
    )
    .join('');
  subtotalEl.textContent = `${formatPrice(subtotal)}`;
}

function renderCart() {
  updateCartCounts();
  renderCartDrawer();
  renderCartPage();
}

function setActiveNavState() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.top-nav a, .mobile-bottom-nav a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const isHome = href.includes('index.html') && path === 'index.html';
    const isShop = href.includes('shop.html') && path === 'shop.html';
    const isProduct = href.includes('product.html') && path === 'product.html';
    const isCart = href.includes('cart.html') && path === 'cart.html';
    const isAbout = href.includes('about.html') && path === 'about.html';
    const isContact = href.includes('contact.html') && path === 'contact.html';
    link.classList.toggle('active', isHome || isShop || isProduct || isCart || isAbout || isContact);
  });
}

function prepareMediaSkeletons() {
  document.querySelectorAll('img, video').forEach((media) => {
    if (media.closest('.media-shell')) return;

    const shell = document.createElement('div');
    shell.className = 'media-shell is-loading';

    const skeleton = document.createElement('div');
    skeleton.className = 'media-skeleton';
    shell.appendChild(skeleton);

    if (media.parentNode) {
      media.parentNode.insertBefore(shell, media);
      shell.appendChild(media);
    }

    const markLoaded = () => {
      shell.classList.add('is-loaded');
      media.style.opacity = '1';
      media.style.visibility = 'visible';
    };

    if (media.tagName === 'VIDEO') {
      media.style.opacity = '0';
      media.style.visibility = 'hidden';
      media.addEventListener('loadedmetadata', () => markLoaded(), { once: true });
      media.addEventListener('canplay', () => {
        markLoaded();
        media.play().catch(() => {});
      }, { once: true });
      media.addEventListener('loadeddata', () => {
        markLoaded();
        media.play().catch(() => {});
      }, { once: true });
      media.addEventListener('error', () => shell.classList.add('is-loaded'), { once: true });
      if (media.readyState >= 2) {
        markLoaded();
        media.play().catch(() => {});
      }
    } else {
      media.style.opacity = '0';
      media.style.visibility = 'hidden';
      media.addEventListener('load', markLoaded, { once: true });
      media.addEventListener('error', () => shell.classList.add('is-loaded'), { once: true });
      if (media.complete) markLoaded();
    }
  });
}

function addToCart(product) {
  if (!product || product.available === 0) return;
  cartItems.push(product);
  saveCart();
  saveState();
  renderCart();
  setCartDrawerOpen(true);
}

function toggleMobileNav() {
  const nav = document.getElementById('siteNav');
  const toggle = document.getElementById('navToggle');
  if (!nav || !toggle) return;
  const isOpen = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(isOpen));
}

function showPageLoader() {
  let overlay = document.getElementById('pageLoader');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pageLoader';
    overlay.innerHTML = '<div class="loader-card"><span></span><p>Loading</p></div>';
    document.body.appendChild(overlay);
  }
  overlay.classList.add('active');
  if (pageLoaderFallbackTimer) {
    clearTimeout(pageLoaderFallbackTimer);
  }
  pageLoaderFallbackTimer = setTimeout(() => {
    hidePageLoader();
  }, 7000);
}

function hidePageLoader() {
  if (pageLoaderFallbackTimer) {
    clearTimeout(pageLoaderFallbackTimer);
    pageLoaderFallbackTimer = null;
  }
  const overlay = document.getElementById('pageLoader');
  if (overlay) overlay.classList.remove('active');
}

function setCartDrawerOpen(isOpen) {
  if (cartDrawer) cartDrawer.classList.toggle('open', isOpen);
  if (cartDrawerBackdrop) cartDrawerBackdrop.classList.toggle('open', isOpen);
}

function openCartDrawer() {
  setCartDrawerOpen(true);
}

function handleLinkNavigation(event) {
  const anchor = event.target.closest('a');
  if (!anchor) return;

  const href = anchor.getAttribute('href');
  const isCartTrigger = anchor.matches('[data-cart-trigger]') || href === '#cart';
  if (isCartTrigger) {
    event.preventDefault();
    openCartDrawer();
    return;
  }

  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || anchor.target === '_blank') return;
  const isLocal = href.startsWith('http') ? window.location.origin === new URL(href, window.location.href).origin : true;
  if (!isLocal) return;
  event.preventDefault();
  showPageLoader();
  setTimeout(() => {
    window.location.href = href;
  }, 220);
}

if (filterRow) {
  filterRow.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    saveState();
    renderFilters();
    renderProducts();
    renderHeroCarousel();
    startHeroCarousel();
  });
}

if (productGrid) {
  productGrid.addEventListener('click', (event) => {
    const card = event.target.closest('.product-card');
    if (!card) return;
    const selected = products.find((product) => product.id === Number(card.dataset.id));
    if (!selected) return;
    showPageLoader();
    setTimeout(() => {
      window.location.href = `product.html?id=${selected.id}`;
    }, 220);
  });
}

if (heroThumbs) {
  heroThumbs.addEventListener('click', (event) => {
    const thumb = event.target.closest('.hero-thumb');
    if (!thumb) return;
    const index = Number(thumb.dataset.index);
    if (Number.isNaN(index)) return;
    heroActiveIndex = index;
    moveHeroCarousel(heroActiveIndex);
    stopHeroCarousel();
    setTimeout(startHeroCarousel, 5200);
  });
}

if (showroomTrigger) {
  showroomTrigger.addEventListener('click', () => {
    const productsToShow = getHeroProducts();
    const selected = productsToShow[heroActiveIndex] || productsToShow[0];
    if (!selected) return;
    showPageLoader();
    setTimeout(() => {
      window.location.href = `product.html?id=${selected.id}`;
    }, 220);
  });

  showroomTrigger.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      showroomTrigger.click();
    }
  });
}

if (viewTabs) {
  viewTabs.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-view]');
    if (!tab) return;
    activeView = tab.dataset.view;
    document.querySelectorAll('.tab').forEach((btn) => btn.classList.toggle('active', btn === tab));
    renderProductDetail(activeProduct);
  });
}

const productGallery = document.getElementById('productGallery');
if (productGallery) {
  productGallery.addEventListener('click', (event) => {
    const thumb = event.target.closest('.gallery-thumb');
    if (!thumb) return;
    activeView = thumb.dataset.view;
    renderProductDetail(activeProduct);
  });
}

if (verifyBtn) {
  verifyBtn.addEventListener('click', () => {
    if (verifyPanel) {
      verifyPanel.classList.add('active');
      verifyPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

if (verifyHeroBtn) {
  verifyHeroBtn.addEventListener('click', () => {
    if (verifyPanel) {
      verifyPanel.classList.add('active');
      verifyPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

if (addToBagBtn) {
  addToBagBtn.addEventListener('click', () => addToCart(activeProduct));
}

const placeOrderBtn = document.getElementById('placeOrderBtn');
const checkoutItemsEl = document.getElementById('checkoutItems');
const checkoutSubtotalEl = document.getElementById('checkoutSubtotal');
const checkoutTotalEl = document.getElementById('checkoutTotal');
const checkoutErrorEl = document.getElementById('checkoutError');

function showCheckoutError(message) {
  if (!checkoutErrorEl) return;
  checkoutErrorEl.textContent = message;
  checkoutErrorEl.style.display = 'block';
}

function renderCheckoutSummary() {
  if (!checkoutItemsEl) return;
  checkoutItemsEl.innerHTML = cartItems.length
    ? cartItems.map((item) => `<div class="summary-row"><span>${item.name}</span><strong>${formatPrice(item.price)}</strong></div>`).join('')
    : '<p class="empty-state">Your cart is empty.</p>';
  const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  if (checkoutSubtotalEl) checkoutSubtotalEl.textContent = formatPrice(subtotal);
  if (checkoutTotalEl) checkoutTotalEl.textContent = formatPrice(subtotal);
}

if (placeOrderBtn) {
  renderCheckoutSummary();
  placeOrderBtn.addEventListener('click', async () => {
    if (checkoutErrorEl) checkoutErrorEl.style.display = 'none';

    const name = document.getElementById('checkoutName')?.value.trim() || '';
    const email = document.getElementById('checkoutEmail')?.value.trim() || '';
    if (!cartItems.length) return showCheckoutError('Your cart is empty — add something before checking out.');
    if (!name) return showCheckoutError('Full name is required.');
    if (!email) return showCheckoutError('Email is required.');

    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Placing order…';
    try {
      const response = await fetch('/api/storefront/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name,
            email,
            address: document.getElementById('checkoutAddress')?.value.trim(),
            city: document.getElementById('checkoutCity')?.value.trim(),
            postcode: document.getElementById('checkoutPostcode')?.value.trim(),
          },
          items: cartItems.map((item) => ({ sku: item.sku, quantity: 1 })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        showCheckoutError(data.error || 'Could not place your order. Please try again.');
        return;
      }
      cartItems = [];
      saveCart();
      saveState();
      window.location.href = `index.html?order=${encodeURIComponent(data.orderNumber)}`;
    } catch (error) {
      showCheckoutError('Could not reach the server. Please try again.');
    } finally {
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = 'Place order';
    }
  });
}

function showOrderConfirmationIfPresent() {
  const orderNumber = new URLSearchParams(window.location.search).get('order');
  if (!orderNumber) return;
  const toast = document.createElement('div');
  toast.className = 'order-confirmation-toast';
  toast.innerHTML = `<strong>Order placed — #${orderNumber}</strong><span>We'll email you as it moves through fulfilment.</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  }, 6000);

  const cleanUrl = window.location.pathname;
  window.history.replaceState({}, '', cleanUrl);
}
showOrderConfirmationIfPresent();

document.querySelectorAll('[data-cart-trigger]').forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    setCartDrawerOpen(!cartDrawer?.classList.contains('open'));
  });
});

if (closeCartBtn) {
  closeCartBtn.addEventListener('click', () => setCartDrawerOpen(false));
}

if (cartDrawerBackdrop) {
  cartDrawerBackdrop.addEventListener('click', () => setCartDrawerOpen(false));
}

if (enterStoreBtn && splashScreen) {
  enterStoreBtn.addEventListener('click', () => {
    splashScreen.classList.add('hidden');
  });
}

const navToggle = document.getElementById('navToggle');
if (navToggle) {
  navToggle.addEventListener('click', toggleMobileNav);
}

document.addEventListener('click', handleLinkNavigation);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(hidePageLoader, 260);
  });
} else {
  setTimeout(hidePageLoader, 260);
}

loadCart();
loadState();
prepareMediaSkeletons();
renderFilters();
renderProductsSkeletons();
renderHeroSkeletons();

const minSkeletonDelay = new Promise((resolve) => setTimeout(resolve, 550));

Promise.all([syncCatalogFromBackend(), minSkeletonDelay]).then(() => {
  const initialHeroProducts = getHeroProducts();
  renderProducts();
  renderHeroCarousel(initialHeroProducts);
  const initialHeroProduct = initialHeroProducts[0];
  if (initialHeroProduct) {
    startShowroomVideo(initialHeroProduct);
  }
  startHeroCarousel(initialHeroProducts);
  if (window.location.pathname.includes('product.html')) {
    renderProductDetail(getProductFromUrl());
  } else if (productVisual && productTitle) {
    renderProductDetail(activeProduct || products[0]);
  }
  prepareMediaSkeletons();
});

// Warm cache for the AI preview and video asset when product detail is loaded
if (window.location.pathname.includes('product.html')) {
  const cacheAssets = (product) => {
    if (!window.caches) return;
    const assetList = [product.aiViews.front, product.video];
    caches.open('tb-product-cache').then((cache) => {
      assetList.forEach((asset) => {
        cache.match(asset).then((match) => {
          if (!match) cache.add(asset).catch(() => {});
        });
      });
    });
  };
  cacheAssets(getProductFromUrl());
}

