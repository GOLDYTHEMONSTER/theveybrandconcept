const products = [
  {
    id: 1,
    name: 'The Sienna Gown',
    category: 'Dresses',
    price: 480,
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
    name: 'The Atelier Set',
    category: 'Sets',
    price: 360,
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
    name: 'The Noir Mini',
    category: 'Dresses',
    price: 290,
    description: 'A sculpted cocktail dress that balances elegance and edge.',
    color: 'Midnight',
    colors: ['#1c1c1c', '#ccb38b', '#8d6f4b'],
    sizes: ['XS', 'S', 'M'],
    image: 'product1/fashn-export-1786297249232.webp',
    aiViews: {
      front: 'product1/fashn-export-1786297249232.webp',
      side: 'product1/fashn-export-1786193085690.webp',
      back: 'product1/0d6b541c953ad00fd2967e69b791dc60e61b5662.webp',
    },
    video: 'product1/fashn-export-1786297223826.mp4',
  },
  {
    id: 4,
    name: 'The Velvet Shift',
    category: 'Tops',
    price: 240,
    description: 'A polished shift with a rich velvet finish and quiet luxury simplicity.',
    color: 'Rosewood',
    colors: ['#6e4d3d', '#f4e2c8', '#1a1a1a'],
    sizes: ['S', 'M', 'L', 'XL'],
    image: 'product2/fashn-export-1786299961980.webp',
    aiViews: {
      front: 'product2/fashn-export-1786299961980.webp',
      side: 'product2/fashn-export-1786300035818.webp',
      back: 'product2/8822279671f6c00c92f6e1f073b90e12b7936f2b.webp',
    },
    video: 'product2/fashn-export-1786300232150.mp4',
  },
];

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
const heroVisualImage = document.querySelector('.hero-visual img');
const heroVideo = document.getElementById('heroVideo');
const heroVideoSource = document.getElementById('heroVideoSource');
const cartContent = document.getElementById('cartContent');
const cartDrawer = document.getElementById('cartDrawer');
const splashScreen = document.getElementById('splashScreen');
const cartList = document.getElementById('cartList');
const subtotalEl = document.getElementById('subtotal');
const viewTabs = document.getElementById('viewTabs');
const verifyBtn = document.getElementById('verifyBtn');
const verifyHeroBtn = document.getElementById('verifyHeroBtn');
const addToBagBtn = document.getElementById('addToBagBtn');
const cartTrigger = document.getElementById('cartTrigger');
const closeCartBtn = document.getElementById('closeCartBtn');
const enterStoreBtn = document.getElementById('enterStoreBtn');
const heroThumbs = document.getElementById('heroThumbs');
const cartCountEls = Array.from(document.querySelectorAll('#cartCount'));

let heroInterval = null;
let heroActiveIndex = 0;

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
  return typeof url === 'string' && /^product[12]\//.test(url);
}

function getHeroProducts() {
  return products.filter((product) => isAuthorizedMedia(product.image) && isAuthorizedMedia(product.video));
}

function renderProducts() {
  if (!productGrid) return;
  const visibleProducts = getVisibleProducts();

  productGrid.innerHTML = visibleProducts
    .map(
      (product) => `
        <article class="product-card" data-id="${product.id}">
          <img src="${product.image}" alt="${product.name}" />
          <div class="meta-row">
            <strong>${product.name}</strong>
            <span>$${product.price}</span>
          </div>
          <p>${product.category}</p>
          <div class="meta-row">
            <span>✦ AI Preview</span>
            <span>✓ Real</span>
          </div>
        </article>
      `,
    )
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

function updateHeroVideo(product) {
  if (!product || !heroVideo || !heroVideoSource) return;
  if (!isAuthorizedMedia(product.video) || !isAuthorizedMedia(product.image)) {
    heroVideoSource.setAttribute('src', '');
    heroVideo.removeAttribute('poster');
    heroVideo.style.display = 'none';
    return;
  }

  heroVideo.style.display = 'block';
  heroVideoSource.setAttribute('src', product.video);
  heroVideo.setAttribute('poster', product.image);
  heroVideo.load();
  heroVideo.muted = true;
  heroVideo.play().catch(() => {
    heroVideo.controls = true;
  });
}

function updateHeroVisual(index, productsToShow = getHeroProducts()) {
  const product = productsToShow[index] || productsToShow[0];
  if (!product || !heroVisualImage) return;

  heroVisualImage.classList.add('fade-out');
  if (heroVideo) heroVideo.classList.add('fade-out');

  window.requestAnimationFrame(() => {
    setTimeout(() => {
      heroVisualImage.src = product.image;
      heroVisualImage.alt = `${product.name} featured preview`;
      updateHeroVideo(product);
      heroVisualImage.classList.remove('fade-out');
      if (heroVideo) heroVideo.classList.remove('fade-out');
    }, 180);
  });
}

function moveHeroCarousel(index, productsToShow = getHeroProducts()) {
  heroActiveIndex = index % productsToShow.length;
  if (heroActiveIndex < 0) heroActiveIndex += productsToShow.length;
  renderHeroCarousel(productsToShow);
  updateHeroVisual(heroActiveIndex, productsToShow);
}

function startHeroCarousel(productsToShow = getHeroProducts()) {
  stopHeroCarousel();
  if (!productsToShow.length || !heroThumbs) return;

  const scheduleNext = () => {
    heroInterval = setTimeout(() => {
      heroActiveIndex = (heroActiveIndex + 1) % productsToShow.length;
      moveHeroCarousel(heroActiveIndex, productsToShow);
      scheduleNext();
    }, getHeroIntervalDelay());
  };

  scheduleNext();
}

function stopHeroCarousel() {
  if (heroInterval) {
    clearTimeout(heroInterval);
    heroInterval = null;
  }
}

function getProductFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const productId = Number(params.get('id'));
  return products.find((product) => product.id === productId) || products[0];
}

function renderProductDetail(product) {
  if (!product) return;
  activeProduct = product;
  saveState();
  if (productVisual) {
    productVisual.innerHTML = `<img src="${product.aiViews[activeView]}" alt="${product.name} ${activeView} view" />`;
  }
  const gallery = document.getElementById('productGallery');
  if (gallery) {
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
  if (productTitle) productTitle.textContent = product.name;
  if (productDescription) productDescription.textContent = product.description;
  if (productPrice) productPrice.textContent = `$${product.price}`;
  if (productCategory) productCategory.textContent = product.category;
  if (productLongDescription) productLongDescription.innerHTML = product.longDescription || '';
  if (productVideo && productVideoSource) {
    const selectedVideo = product.video;
    const selectedPoster = product.image;
    if (isAuthorizedMedia(selectedVideo) && isAuthorizedMedia(selectedPoster)) {
      productVideoSource.setAttribute('src', selectedVideo);
      productVideo.setAttribute('poster', selectedPoster);
      productVideo.style.display = 'block';
      productVideo.load();
      productVideo.muted = true;
      productVideo.play().catch(() => {
        productVideo.controls = true;
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
  if (!cartItems.length) {
    cartContent.innerHTML = '<p class="empty-state">Your selected pieces will appear here.</p>';
    return;
  }

  cartContent.innerHTML = cartItems
    .map(
      (item) => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" />
          <div>
            <strong>${item.name}</strong>
            <p>${item.category}</p>
            <p>$${item.price}</p>
          </div>
        </div>
      `,
    )
    .join('');
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
            <p>$${item.price}</p>
          </div>
        </div>
      `,
    )
    .join('');
  subtotalEl.textContent = `$${subtotal}`;
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

    const markLoaded = () => shell.classList.add('is-loaded');

    if (media.tagName === 'VIDEO') {
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
      media.addEventListener('load', markLoaded, { once: true });
      media.addEventListener('error', () => shell.classList.add('is-loaded'), { once: true });
      if (media.complete) markLoaded();
    }
  });
}

function addToCart(product) {
  cartItems.push(product);
  saveCart();
  saveState();
  renderCart();
  if (cartDrawer) {
    cartDrawer.classList.add('open');
  }
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
}

function hidePageLoader() {
  const overlay = document.getElementById('pageLoader');
  if (overlay) overlay.classList.remove('active');
}

function handleLinkNavigation(event) {
  const anchor = event.target.closest('a');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
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
    if (window.location.pathname.includes('shop.html')) {
      activeProduct = selected;
      saveState();
      showPageLoader();
      setTimeout(() => {
        window.location.href = `product.html?id=${selected.id}`;
      }, 220);
    } else {
      renderProductDetail(selected);
    }
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

if (cartTrigger) {
  cartTrigger.addEventListener('click', () => {
    if (cartDrawer) {
      cartDrawer.classList.toggle('open');
    }
  });
}

if (closeCartBtn) {
  closeCartBtn.addEventListener('click', () => {
    if (cartDrawer) {
      cartDrawer.classList.remove('open');
    }
  });
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
renderProducts();
const initialHeroProducts = getHeroProducts();
renderHeroCarousel(initialHeroProducts);
updateHeroVisual(0, initialHeroProducts);
startHeroCarousel(initialHeroProducts);
if (window.location.pathname.includes('product.html')) {
  renderProductDetail(getProductFromUrl());
} else if (productVisual && productTitle) {
  renderProductDetail(activeProduct || products[0]);
}

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

