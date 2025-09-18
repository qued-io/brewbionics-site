export default class HelloPlusHeaderHandler extends elementorModules.frontend.handlers.Base {
    getDefaultSettings() {
        return {
            selectors: {
                main: '.ehp-header',
                navigationToggle: '.ehp-header__button-toggle',
				dropdownToggle: '.ehp-header__dropdown-toggle',
				navigation: '.ehp-header__navigation',
				dropdown: '.ehp-header__dropdown',
				wpAdminBar: '#wpadminbar',
				menuCartItems: '.ehp-header__menu-cart-items',
				menuCartButton: '.ehp-header__menu-cart-button',
				menuCartClose: '.ehp-header__menu-cart-close',
				floatingBars: '.e-floating-bars.has-vertical-position-top',
            },
			constants: {
				mobilePortrait: 767,
				tabletPortrait: 1024,
				mobile: 'mobile',
				tablet: 'tablet',
				desktop: 'desktop',
				dataScrollBehavior: 'data-scroll-behavior',
				dataBehaviorFloat: 'data-behavior-float',
				scrollUp: 'scroll-up',
				always: 'always',
				none: 'none',
				no: 'no',
			},
        };
    }

	getDefaultElements() {
		const selectors = this.getSettings( 'selectors' );

		return {
			main: this.$element[ 0 ].querySelector( selectors.main ),
			navigationToggle: this.$element[ 0 ].querySelector( selectors.navigationToggle ),
			dropdownToggle: this.$element[ 0 ].querySelectorAll( selectors.dropdownToggle ),
			navigation: this.$element[ 0 ].querySelector( selectors.navigation ),
			dropdown: this.$element[ 0 ].querySelector( selectors.dropdown ),
			wpAdminBar: document.querySelector( selectors.wpAdminBar ),
			menuCartItems: this.$element[ 0 ].querySelectorAll( selectors.menuCartItems ),
			menuCartButton: this.$element[ 0 ].querySelectorAll( selectors.menuCartButton ),
			menuCartClose: this.$element[ 0 ].querySelectorAll( selectors.menuCartClose ),
			floatingBars: document.querySelector( selectors.floatingBars ),
		};
	}

    bindEvents() {
		if ( this.elements.navigationToggle ) {
			this.elements.navigationToggle.addEventListener( 'click', () => this.toggleNavigation() );
		}

		if ( this.elements.dropdownToggle.length > 0 ) {
			this.elements.dropdownToggle.forEach( ( menuItem ) => {
				menuItem.addEventListener( 'click', ( event ) => this.toggleSubMenu( event ) );
			} );
		}

		if ( this.elements.main ) {
			this.elements.main.addEventListener( 'click', ( event ) => this.handleCartButtonClicks( event ) );
			window.addEventListener( 'resize', () => this.onResize() );
			window.addEventListener( 'scroll', () => this.onScroll() );
			document.addEventListener( 'click', ( event ) => this.handleDocumentClick( event ) );
			document.addEventListener( 'keydown', ( event ) => this.handleKeydown( event ) );
		}
    }

	handleCartButtonClicks( event ) {
		const target = event.target;
		const matches = ( selector ) => target.classList.contains( selector ) || target.closest( `.${ selector }` );

		const isMenuCartButton = matches( 'ehp-header__menu-cart-button' );

		if ( isMenuCartButton ) {
			this.toggleMenuCart( event );
			return;
		}

		const isMenuCartClose = matches( 'ehp-header__menu-cart-close' );

		if ( isMenuCartClose ) {
			this.handleMenuCartCloseClick( event );
			return;
		}

		const isMenuCartItems = matches( 'ehp-header__menu-cart-items' );

		if ( ! isMenuCartItems ) {
			this.closeOpenMenuCart();
		}
	}

	onInit( ...args ) {
		super.onInit( ...args );

		this.initDefaultState();
		this.scrollTimeout = null;
		this.originalBodyOverflow = document.body.style.overflow;
	}

	initDefaultState() {
		this.lastScrollY = window.scrollY;

		const { none, no, always, scrollUp } = this.getSettings( 'constants' );

		this.handleAriaAttributesMenu();
		this.handleAriaAttributesDropdown();
		this.handleOffsetTop();

		if ( none === this.getDataScrollBehavior() && no === this.getBehaviorFloat() ) {
			this.setupInnerContainer();
		}

		if ( scrollUp === this.getDataScrollBehavior() || always === this.getDataScrollBehavior() ) {
			this.applyBodyPadding();
		}

		if ( this.elements.menuCartItems ) {
			this.handleInertMenuCart();
		}
	}

	getBehaviorFloat() {
		const { dataBehaviorFloat } = this.getSettings( 'constants' );
		return this.elements.main.getAttribute( dataBehaviorFloat );
	}

	getDataScrollBehavior() {
		const { dataScrollBehavior } = this.getSettings( 'constants' );
		return this.elements.main.getAttribute( dataScrollBehavior );
	}

	setupInnerContainer() {
		this.elements.main.closest( '.e-con-inner' )?.classList.add( 'e-con-inner--ehp-header' );
		this.elements.main.closest( '.e-con' )?.classList.add( 'e-con--ehp-header' );
	}

	onResize() {
		this.handleAriaAttributesMenu();
		this.handleOffsetTop();
	}

	onScroll() {
		const { scrollUp, always, none } = this.getSettings( 'constants' );

		if ( this.scrollTimeout ) {
			cancelAnimationFrame( this.scrollTimeout );
		}

		if ( scrollUp === this.getDataScrollBehavior() || always === this.getDataScrollBehavior() ) {
			this.handleScrollDown( this.getDataScrollBehavior() );
		}

		if ( this.elements.floatingBars && none === this.getDataScrollBehavior() && this.elements.main.classList.contains( 'has-behavior-float' ) ) {
			this.setFloatingBarsHeight();
		}

		this.scrollTimeout = requestAnimationFrame( () => {
			this.onScrollEnd();
		} );
	}

	onScrollEnd() {
		if ( this.elements.floatingBars ) {
			this.setFloatingBarsHeight();
		}
	}

	handleOffsetTop() {
		const wpAdminBarOffsetHeight = this.elements.wpAdminBar?.offsetHeight || 0;
		const floatingBars = this.elements.floatingBars;

		this.elements.main.style.setProperty( '--header-wp-admin-bar-height', `${ wpAdminBarOffsetHeight }px` );

		if ( this.elements.floatingBars ) {
			const floatingBarsHeight = this.elements.floatingBars?.offsetHeight || 0;
			this.elements.main.style.setProperty( '--header-floating-bars-height', `${ floatingBarsHeight }px` );

			if ( this.mutationObserver ) {
				this.mutationObserver.disconnect();
			}

			const observer = new MutationObserver( () => {
				const newHeight = floatingBars.offsetHeight;
				this.elements.main.style.setProperty( '--header-floating-bars-height', `${ newHeight }px` );
				this.applyBodyPadding();
			} );

			this.mutationObserver = observer;
			observer.observe( floatingBars, { attributes: true, childList: true } );
		}
	}

	applyBodyPadding() {
		const mainHeight = this.elements.main.offsetHeight;
		const floatingBars = this.elements.floatingBars;

		if ( floatingBars ) {
			const { none } = this.getSettings( 'constants' );

			if ( none !== this.getDataScrollBehavior() ) {
				if ( ! floatingBars.classList.contains( 'is-sticky' ) && ! floatingBars.classList.contains( 'is-hidden' ) ) {
					floatingBars.style.marginBottom = `${ mainHeight }px`;
					document.body.style.paddingTop = '0';
				} else if ( floatingBars.classList.contains( 'is-sticky' ) ) {
					const floatingBarsHeight = floatingBars?.offsetHeight || 0;
					document.body.style.paddingTop = `${ mainHeight + floatingBarsHeight }px`;
				}
			}
		} else {
			document.body.style.paddingTop = `${ mainHeight }px`;
		}
	}

	handleAriaAttributesDropdown() {
		this.elements.dropdownToggle.forEach( ( item ) => {
			item.nextElementSibling.setAttribute( 'aria-hidden', 'true' );
		} );
	}

	handleInertMenuCart() {
		this.elements.menuCartItems.forEach( ( item ) => {
			item.setAttribute( 'inert', '' );
		} );
	}

	handleAriaAttributesMenu() {
		if ( this.isResponsiveBreakpoint() ) {
			this.elements.navigationToggle.setAttribute( 'aria-expanded', 'false' );
			this.elements.navigation.setAttribute( 'aria-hidden', 'true' );
		}
	}

	handleDocumentClick( event ) {
		const target = event.target;
		const isMenuCartButton = target.closest( '.ehp-header__menu-cart-button' );
		const isMenuCartItems = target.closest( '.ehp-header__menu-cart-items' );

		if ( ! isMenuCartButton && ! isMenuCartItems ) {
			this.closeOpenMenuCart();
		}
	}

	handleKeydown( event ) {
		if ( 'Escape' === event.key ) {
			this.closeOpenMenuCart();
		}
	}

	toggleSubMenu( event ) {
		event.preventDefault();
		const target = event.target;
		const isSvg = target.classList.contains( 'ehp-header__submenu-toggle-icon' );
		const targetItem = isSvg ? target.parentElement : target;
		const subMenu = isSvg ? target.parentElement.nextElementSibling : target.nextElementSibling;
		const ariaHidden = subMenu.getAttribute( 'aria-hidden' );

		if ( 'true' === ariaHidden ) {
			this.closeAllOtherSubMenus( targetItem );
			this.openSubMenu( targetItem, subMenu );
		} else {
			this.closeSubMenu( targetItem, subMenu );
		}
	}

	closeAllOtherSubMenus( currentTargetItem ) {
		Array.from( this.elements.dropdownToggle ).forEach( ( toggle ) => {
			if ( toggle !== currentTargetItem && 'true' === toggle.getAttribute( 'aria-expanded' ) ) {
				const menu = toggle.nextElementSibling;
				this.closeSubMenu( toggle, menu );
			}
		} );
	}

	openSubMenu( targetItem, subMenu ) {
		targetItem.setAttribute( 'aria-expanded', 'true' );
		subMenu.setAttribute( 'aria-hidden', 'false' );
	}

	closeSubMenu( targetItem, subMenu ) {
		targetItem.setAttribute( 'aria-expanded', 'false' );
		subMenu.setAttribute( 'aria-hidden', 'true' );
	}

	handleScrollDown( behaviorOnScroll ) {
		const currentScrollY = window.scrollY;
		const headerHeight = this.elements.main.offsetHeight;
		const wpAdminBarOffsetHeight = this.elements.wpAdminBar?.offsetHeight || 0;
		const headerFloatOffsetProperty = getComputedStyle( this.elements.main ).getPropertyValue( '--header-float-offset' );
		const headerFloatOffset = parseInt( headerFloatOffsetProperty, 10 ) || 0;
		const totalOffset = headerHeight + wpAdminBarOffsetHeight + headerFloatOffset;

		if ( currentScrollY <= 0 ) {
			this.elements.main.classList.remove( 'scroll-down' );
			this.elements.main.style.removeProperty( '--header-scroll-down' );
			return;
		}

		if ( currentScrollY > this.lastScrollY ) {
			this.elements.main.classList.add( 'scroll-down' );

			const { scrollUp } = this.getSettings( 'constants' );
			if ( scrollUp === behaviorOnScroll ) {
				this.elements.main.style.setProperty( '--header-scroll-down', `${ totalOffset }px` );
			}
		} else {
			this.elements.main.classList.remove( 'scroll-down' );
			this.elements.main.style.removeProperty( '--header-scroll-down' );
		}

		if ( this.elements.floatingBars ) {
			requestAnimationFrame( () => {
				this.setFloatingBarsHeight();
			} );
		}

		this.lastScrollY = currentScrollY;
	}

	setFloatingBarsHeight() {
		const floatingBarsRect = this.elements.floatingBars.getBoundingClientRect();
		const visibleHeight = Math.max( 0, Math.min( floatingBarsRect.height, floatingBarsRect.bottom ) );
		this.elements.main.style.setProperty( '--header-floating-bars-height', `${ visibleHeight }px` );
	}

	isResponsiveBreakpoint() {
		const responsiveBreakpoint = this.elements.main.getAttribute( 'data-responsive-breakpoint' );

		if ( ! responsiveBreakpoint ) {
			return false;
		}

		const { mobilePortrait, tabletPortrait } = this.getSettings( 'constants' );

		const breakpointValue = 'tablet-portrait' === responsiveBreakpoint ? tabletPortrait : mobilePortrait;

		return window.innerWidth <= breakpointValue;
	}

    toggleNavigation() {
		const isNavigationHidden = this.elements.navigation.getAttribute( 'aria-hidden' );

		if ( 'true' === isNavigationHidden ) {
			this.elements.navigation.setAttribute( 'aria-hidden', 'false' );
			this.elements.navigationToggle.setAttribute( 'aria-expanded', 'true' );
		} else {
			this.elements.navigation.setAttribute( 'aria-hidden', 'true' );
			this.elements.navigationToggle.setAttribute( 'aria-expanded', 'false' );
		}
    }

	toggleMenuCart( event ) {
		event.preventDefault();

		const target = event.target;
		const cartMenuItems = target.nextElementSibling;
		const inert = cartMenuItems.hasAttribute( 'inert' );

		if ( inert ) {
			this.openMenuCart( cartMenuItems );
		} else {
			this.closeMenuCart( cartMenuItems );
		}

		if ( this.isResponsiveBreakpoint() && 'false' === this.elements.navigation.getAttribute( 'aria-hidden' ) ) {
			this.toggleNavigation();
		}
	}

	closeOpenMenuCart() {
		const openCart = this.elements.main.querySelector( '.ehp-header__menu-cart-items:not([inert])' );
		if ( openCart ) {
			this.closeMenuCart( openCart );
		}
	}

	handleMenuCartCloseClick( event ) {
		event.preventDefault();
		this.closeOpenMenuCart();
	}

	openMenuCart( cartMenuItems ) {
		cartMenuItems.removeAttribute( 'inert' );

		const cartMenuList = cartMenuItems.querySelector( '.ehp-header__menu-cart-list' );

		if ( cartMenuList &&
			this.isResponsiveBreakpoint() &&
			this.checkCartMenuItemsOverflow( cartMenuList )
		) {
			if ( this.originalBodyOverflow !== document.body.style.overflow ) {
				this.originalBodyOverflow = document.body.style.overflow;
			}

			document.body.style.overflow = 'hidden';
		}
	}

	checkCartMenuItemsOverflow( cartMenuItems ) {
		return cartMenuItems.scrollHeight > cartMenuItems.clientHeight;
	}

	closeMenuCart( cartMenuItems ) {
		cartMenuItems.setAttribute( 'inert', '' );

		if ( this.isResponsiveBreakpoint() ) {
			document.body.style.overflow = this.originalBodyOverflow;
		}
	}
}
