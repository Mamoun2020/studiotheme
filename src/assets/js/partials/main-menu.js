
/* ============================================================
   NavigationMenu — <custom-main-menu>
   The main header menu (desktop mega-menu + mobile slide-out)
   ============================================================ */
class NavigationMenu extends HTMLElement {
    connectedCallback() {
        salla.onReady()
            .then(() => salla.lang.onLoaded())
            .then(() => {
                this.menus = [];
                this.displayAllText = salla.lang.get('blocks.home.display_all');
                this.moreText = salla.lang.get('common.titles.more');
                this.visibleMenus = [];
                this.overflowMenus = [];

                return salla.api.component.getMenus()
                .then(({ data }) => {
                    this.menus = data;
                    return this.render()
                }).then(() => {
                    this.initializeResponsiveMenu();
                }).catch((error) => salla.logger.error('salla-menu::Error fetching menus', error));
            });
    }

    hasChildren(menu) {
        return menu?.children?.length > 0;
    }

    hasProducts(menu) {
        return menu?.products?.length > 0;
    }

    getDesktopClasses(menu, isRootMenu) {
        return `!hidden lg:!block ${isRootMenu ? 'root-level lg:!inline-block' : 'relative'} ${menu.products ? ' mega-menu' : ''}
        ${this.hasChildren(menu) ? ' has-children' : ''}`
    }

    getMobileMenu(menu, displayAllText) {
        const menuImage = menu.image ? `<img src="${menu.image}" class="rounded-full" width="48" height="48" alt="${menu.title}" />` : '';

        return `
        <li class="lg:hidden text-sm font-bold" ${menu.attrs}>
            ${!this.hasChildren(menu) ? `
                <a href="${menu.url}" aria-label="${menu.title || 'category'}" class="text-gray-500 ${menu.image ? '!py-3' : ''}" ${menu.link_attrs}>
                    ${menuImage}
                    <span>${menu.title || ''}</span>
                </a>` :
                `
                <span class="${menu.image ? '!py-3' : ''}">
                    ${menuImage}
                    ${menu.title}
                </span>
                <ul>
                    <li class="text-sm font-bold">
                        <a href="${menu.url}" class="text-gray-500">${displayAllText}</a>
                    </li>
                    ${menu.children.map((subMenu) => this.getMobileMenu(subMenu, displayAllText)).join('')}
                </ul>
            `}
        </li>`;
    }

    getDesktopMenu(menu, isRootMenu, additionalClasses = '') {
        return `
        <li class="${this.getDesktopClasses(menu, isRootMenu)} ${additionalClasses}" ${menu.attrs} data-menu-item>
            <a href="${menu.url}" aria-label="${menu.title || 'category'}" ${menu.link_attrs}>
                <span>${menu.title}</span>
            </a>
            ${this.hasChildren(menu) ? `
                <div class="sub-menu ${this.hasProducts(menu) ? 'w-full left-0 flex' : 'w-56'}">
                    <ul class="${this.hasProducts(menu) ? 'w-56 shrink-0 m-8 rtl:ml-0 ltr:mr-0' : ''}">
                        ${menu.children.map((subMenu) => this.getDesktopMenu(subMenu, false)).join('\n')}
                    </ul>
                    ${this.hasProducts(menu) ? `
                    <salla-products-list
                    source="selected"
                    shadow-on-hover
                    source-value="[${menu.products}]" />` : ''}
                </div>` : ''}
        </li>`;
    }

    getMenus() {
        return this.menus.map((menu) => `
            ${this.getMobileMenu(menu, this.displayAllText)}
            ${this.getDesktopMenu(menu, true)}
        `).join('\n');
    }

    createMoreDropdown() {
        if (this.overflowMenus.length === 0) return '';

        return `
        <li class="!hidden lg:!block root-level lg:!inline-block has-children relative" id="more-menu-dropdown">
            <a href="#" aria-label="${this.moreText}">
                <span>${this.moreText}</span>
            </a>
            <div class="sub-menu w-56">
                <ul>
                    ${this.overflowMenus.map((menu) => this.getDesktopMenu(menu, false)).join('\n')}
                </ul>
            </div>
        </li>`;
    }

    initializeResponsiveMenu() {
        if (window.innerWidth < 1024) return;

        const mainMenu = this.querySelector('.main-menu');
        if (!mainMenu) return;

        const isMoreMenuEnabled = window.enable_more_menu;
        if (!isMoreMenuEnabled) return;

        this.checkMenuOverflow();

        const resizeHandler = this.debounce(() => {
            this.checkMenuOverflow();
        }, 250);

        window.addEventListener('resize', resizeHandler);
    }

    checkMenuOverflow() {
        const mainMenu = this.querySelector('.main-menu');
        if (!mainMenu) return;

        const container = mainMenu.closest('.container');
        if (!container) return;

        this.visibleMenus = [...this.menus];
        this.overflowMenus = [];

        const existingMore = mainMenu.querySelector('#more-menu-dropdown');
        if (existingMore) existingMore.remove();

        const menuItems = mainMenu.querySelectorAll('.root-level[data-menu-item]');
        menuItems.forEach(item => { item.style.display = ''; });

        const containerWidth = container.offsetWidth;
        const otherElements = container.querySelector('.flex').children;
        let usedWidth = 0;

        Array.from(otherElements).forEach(element => {
            if (!element.contains(mainMenu)) usedWidth += element.offsetWidth;
        });

        const availableWidth = containerWidth - usedWidth - 300;
        let currentWidth = 0;
        let visibleCount = 0;

        menuItems.forEach((item, index) => {
            const itemWidth = item.offsetWidth;
            if (currentWidth + itemWidth <= availableWidth && index < this.menus.length) {
                currentWidth += itemWidth;
                visibleCount++;
            } else {
                item.style.setProperty('display', 'none', 'important');
                if (index < this.menus.length) this.overflowMenus.push(this.menus[index]);
            }
        });

        this.visibleMenus = this.menus.slice(0, visibleCount);
        if (this.overflowMenus.length > 0) {
            mainMenu.insertAdjacentHTML('beforeend', this.createMoreDropdown());
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    render() {
        this.innerHTML = `
        <nav id="mobile-menu" class="mobile-menu">
            <ul class="main-menu">${this.getMenus()}</ul>
            <button class="btn--close close-mobile-menu sicon-cancel lg:hidden"></button>
        </nav>
        <button class="btn--close-sm close-mobile-menu sicon-cancel hidden"></button>`;
    }
}

customElements.define('custom-main-menu', NavigationMenu);


/* ============================================================
   CategoryBar — <custom-category-bar>
   Dark horizontal navigation bar — Figma design
   bg: #1D1F1F | height: 44px | gap: 24px | 16px white text
   ============================================================ */
class CategoryBar extends HTMLElement {
    connectedCallback() {
        salla.onReady()
            .then(() => salla.api.component.getMenus())
            .then(({ data }) => {
                this.menus = data;
                this.render();
            })
            .catch((error) => salla.logger.error('CategoryBar::Error fetching menus', error));
    }

    arrowSVG() {
        return `<svg class="category-bar__arrow" width="12" height="12" viewBox="0 0 12 12"
                     fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    }

    getItem(menu, isRoot = false) {
        const hasChildren = menu?.children?.length > 0;
        return `
        <li class="category-bar__item${isRoot ? ' is-root' : ''}${hasChildren ? ' has-children' : ''}">
            <a href="${menu.url}" class="category-bar__link" ${menu.link_attrs || ''}>
                <span class="category-bar__title">${menu.title || ''}</span>
                ${hasChildren ? this.arrowSVG() : ''}
            </a>
            ${hasChildren ? `
            <div class="category-bar__dropdown">
                <ul class="category-bar__sub">
                    ${menu.children.map(child => this.getItem(child)).join('')}
                </ul>
            </div>` : ''}
        </li>`;
    }

    render() {
        this.innerHTML = `
        <ul class="category-bar__list">
            ${this.menus.map(menu => this.getItem(menu, true)).join('')}
        </ul>`;
    }
}

customElements.define('custom-category-bar', CategoryBar);
