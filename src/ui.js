import { 
  IconPicture,
  IconCross,
  IconChevronLeft,
  IconChevronRight
} from '@codexteam/icons';
import { make } from './utils/dom';
import UnsplashClient from './utils/unsplashClient';

/**
 * Class for working with UI:
 *  - rendering base structure
 *  - show/hide preview
 *  - apply tune view
 */
export default class Ui {
  /**
   * @param {object} ui - image tool Ui module
   * @param {object} ui.api - Editor.js API
   * @param {ImageConfig} ui.config - user config
   * @param {Function} ui.onSelectFile - callback for clicks on Select file button
   * @param {Function} ui.onEmbedUrl - callback when embedding an url
   * @param {Function} ui.onSetLink - callback when setting a link on image
   * @param {boolean} ui.readOnly - read-only mode flag
   */
  constructor({ api, config, onSelectFile, onEmbedUrl, onSetLink, readOnly }) {
    this.api = api;
    this.config = config;
    this.onSelectFile = onSelectFile;
    this.onEmbedUrl = onEmbedUrl;
    this.onSetLink = onSetLink;
    this.link = '';
    this.readOnly = readOnly;
    this.unsplashClient = new UnsplashClient(this.config.unsplash);
    this.unsplashTimer = null;
    this.nodes = {
      wrapper: make('div', [this.CSS.baseClass, this.CSS.wrapper]),
      imageContainer: make('div', [ this.CSS.imageContainer ]),
      buttonsWrapper: make('div', [ this.CSS.buttonsWrapper ]),
      fileButton: this.createFileButton(),
      embedButton: this.createEmbedButton(),
      unsplashButton: this.createUnsplashButton(),
      imageEl: undefined,
      imagePreloader: make('div', this.CSS.imagePreloader),
      captionAltWrapper: make('div', [this.CSS.captionAltWrapper]),
      captionAltToggler: this.createCaptionAltToggler(),
      caption: make('div', [this.CSS.input, this.CSS.caption], {
        contentEditable: !this.readOnly,
      }),
      alt: make('div', [this.CSS.input, this.CSS.alt], {
        contentEditable: true
      })
    };

    /**
     * Create base structure
     *  <wrapper>
     *    <image-container>
     *      <image-preloader />
     *    </image-container>
     *    <caption-alt-wrapper>
     *      <caption />
     *      <alt />
     *      <caption-alt-toggler />
     *    </caption-alt-wrapper>
     *    <select-file-button />
     *    <embed-modal />
     *  </wrapper>
     */
    this.nodes.caption.dataset.placeholder = this.config.captionPlaceholder;
    this.nodes.alt.dataset.placeholder = this.config.altPlaceholder;
    this.nodes.imageContainer.appendChild(this.nodes.imagePreloader);
    this.nodes.wrapper.appendChild(this.nodes.imageContainer);
    this.nodes.wrapper.appendChild(this.nodes.captionAltWrapper);
    this.nodes.captionAltWrapper.appendChild(this.nodes.caption);
    this.nodes.captionAltWrapper.appendChild(this.nodes.alt);
    this.nodes.captionAltWrapper.appendChild(this.nodes.captionAltToggler);
    
    this.nodes.wrapper.appendChild(this.nodes.buttonsWrapper);
    this.nodes.buttonsWrapper.appendChild(this.nodes.fileButton);
    this.nodes.buttonsWrapper.appendChild(this.nodes.embedButton);
    this.nodes.buttonsWrapper.appendChild(this.nodes.unsplashButton);
    
  }

  /**
   * CSS classes
   *
   * @returns {object}
   */
  get CSS() {
    return {
      baseClass: this.api.styles.block,
      loading: this.api.styles.loader,
      input: this.api.styles.input,
      button: this.api.styles.button,

      /**
       * Tool's classes
       */
      wrapper: 'image-tool',
      imageContainer: 'image-tool__image',
      imagePreloader: 'image-tool__image-preloader',
      imageEl: 'image-tool__image-picture',
      captionAltWrapper: 'image-tool__wrapper',
      caption: 'image-tool__wrapper-caption',
      alt: 'image-tool__wrapper-alt',
      toggler: 'image-tool__wrapper-toggler',
      buttonsWrapper: 'image-tool__button-wrapper',
      modal: 'image-tool__modal',
      modalContainer: 'image-tool__modal-container',
      modalTitle: 'image-tool__modal-container-title',
      modalInputContainer: 'image-tool__modal-container__input-container',
      modalInputCross: 'image-tool__modal-container__input-container-cross',
      embedModal: 'image-tool__modal-embed',
      unsplashModal: 'image-tool__modal-unsplash',
      unsplashGallery: 'image-tool__modal-unsplash__gallery',
      unsplashGalleryPagination: 'image-tool__modal-unsplash__gallery__pagination',
      unsplashGalleryPaginationButton: 'image-tool__modal-unsplash__gallery__pagination__button',
      unsplashGalleryColumn: 'image-tool__modal-unsplash__gallery__column',
      unsplashGalleryThumbnail: 'image-tool__modal-unsplash__gallery__thumb'
    };
  };

  /**
   * Ui statuses:
   * - empty
   * - uploading
   * - filled
   *
   * @returns {{EMPTY: string, UPLOADING: string, FILLED: string}}
   */
  static get status() {
    return {
      EMPTY: 'empty',
      UPLOADING: 'loading',
      FILLED: 'filled',
    };
  }

  /**
   * Renders tool UI
   *
   * @param {ImageToolData} toolData - saved tool data
   * @returns {Element}
   */
  render(toolData) {
    if (!toolData.file || Object.keys(toolData.file).length === 0) {
      this.toggleStatus(Ui.status.EMPTY);
    } else {
      this.toggleStatus(Ui.status.UPLOADING);
    }

    return this.nodes.wrapper;
  }

  /**
   * Creates upload-file button
   *
   * @returns {Element}
   */
  createFileButton() {
    const button = make('div', [ this.CSS.button ]);

    button.innerHTML = this.config.uploadButtonContent || `${IconPicture} ${this.api.i18n.t('Select an Image')}`;

    button.addEventListener('click', () => {
      this.onSelectFile();
    });

    return button;
  }

  showLinkModal() {
    /*
    <title>
    <input-container>
      <input>
      <input-empty>
    </input-container>
    */

    const modalTitle = make('div', [ this.CSS.modalTitle ]);
    modalTitle.innerHTML = this.api.i18n.t('Link');
    const modal = this.createModal();
    
    // FIXME: CSS
    const linkModal = make('div', [ this.CSS.modalContainer, this.CSS.embedModal ]);
    linkModal.appendChild(modalTitle);

    const modalInputContainer = make('div', [this.CSS.modalInputContainer]);
    const modalInput = make('input', [this.CSS.input], {type: 'text', value: this.link});
    const modalInputCross = make('div', [this.CSS.modalInputCross]);
    modalInputCross.innerHTML = IconCross;
    modalInputCross.addEventListener('click', () => {
      modalInput.value = '';
      this.link = '';
      this.onSetLink('');
    });

    // Submit link on Enter
    modalInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') {
          this.link = modalInput.value;
          this.onSetLink(modalInput.value);
          this.removeModal(modal);
      }
    });

    modalInputContainer.appendChild(modalInput);
    modalInputContainer.appendChild(modalInputCross);

    linkModal.appendChild(modalInputContainer);
    modal.appendChild(linkModal);
    document.body.appendChild(modal);
    modalInput.focus();
  }

  createEmbedButton() {
    const button = make('div', [ this.CSS.button ]);
    button.innerHTML = this.config.embedButtonContent || `${IconPicture} ${this.api.i18n.t('Embed an Image')}`;

    button.addEventListener('click', () => {
      this.showEmbedModal();
    })
    return button;
  }

  showEmbedModal() {
    const modalTitle = make('div', [ this.CSS.modalTitle ]);
    modalTitle.innerHTML = this.api.i18n.t('Embed an Image');
    const modal = this.createModal();
    const embedModal = make('div', [ this.CSS.modalContainer, this.CSS.embedModal ]);
    embedModal.appendChild(modalTitle);

    const modalInput = make('input', [this.CSS.input], { type: 'text' });

    // Submit link on Enter
    modalInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') {
        this.onEmbedUrl(modalInput.value);
        this.removeModal(modal);
      }
    });
    embedModal.appendChild(modalInput);
    modal.appendChild(embedModal);
    document.body.appendChild(modal);
    modalInput.focus();
  }

  createModal() {
    const modal = make('div', [ this.CSS.modal ]);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        this.removeModal(modal);
      }
    })
    return modal
  }

  removeModal(modal) {
    document.body.removeChild(modal);
  }

  createUnsplashButton() {
    const button = make('div', [ this.CSS.button ]);
    button.innerHTML = this.config.unsplash.buttonContent || `${IconPicture} ${this.api.i18n.t('Embed an Image from Unsplash')}`;

    button.addEventListener('click', () => {
      this.showUnsplashModal();
    })
    return button;
  }

  showUnsplashModal() {
    /*
    <title>
    <input>
    <resultset>
    */

    const modalTitle = make('div', [ this.CSS.modalTitle ]);

    modalTitle.innerHTML = this.api.i18n.t('Unsplash');
    const modal = this.createModal();
    const unsplashModal = make('div', [ this.CSS.modalContainer, this.CSS.unsplashModal ]); // FIXME: CSS unsplashModal
    unsplashModal.appendChild(modalTitle);

    const inputPlaceholder = this.config.unsplash.inputPlaceholder || this.api.i18n.t('Search keyword on Unsplash');
    const modalInput = make('input', [this.CSS.input], { type: 'text', placeholder: inputPlaceholder });
    const modalResultset = make('div');
    
    modalInput.addEventListener('input', (event) => {
      this.debounceUnsplashSearch(event.target.value, modalResultset)
    });
    
    unsplashModal.appendChild(modalInput);
    unsplashModal.appendChild(modalResultset);
    modal.appendChild(unsplashModal);

    document.body.appendChild(modal);
    modalInput.focus();
  }

  debounceUnsplashSearch(text, DOMrecipient) {
    clearTimeout(this.unsplashTimer);
    DOMrecipient.innerHTML = '<div class="image-tool__image-preloader"></div>';
    this.unsplashTimer = setTimeout(() => {
      this.doUnsplashSearch(text, 1, DOMrecipient);
    }, 1000);
  }

  doUnsplashSearch(text, page, DOMrecipient) {
    DOMrecipient.innerHTML = '<div class="image-tool__image-preloader"></div>';
    this.unsplashClient.search(text, page, (images) => {
      this.addUnsplashImagesToResults(images, DOMrecipient); 
    });
  }

  addUnsplashImagesToResults(resultset, DOMrecipient) {
    DOMrecipient.innerHTML = '';
    if (resultset.results && resultset.results.length) {
      const paginationContainer = make('div', this.CSS.unsplashGalleryPagination);
      
      if (resultset.previous_page !== null) {
        const previous = make('div', this.CSS.unsplashGalleryPaginationButton, {
          innerHTML: `${IconChevronLeft} Previous`,
          onclick: () => { this.doUnsplashSearch(resultset.query, resultset.previous_page, DOMrecipient); }})
        paginationContainer.appendChild(previous);
      } else {
        const previous = make('div');
        paginationContainer.appendChild(previous);
      }


      const paginationText = make('div', '', {
        innerHTML: `Page ${resultset.page} / ${resultset.total_pages}`
      });
      paginationContainer.appendChild(paginationText);
      
      if (resultset.next_page !== null) {
        const previous = make('div', this.CSS.unsplashGalleryPaginationButton, {
          innerHTML: `Next ${IconChevronRight}`,
          onclick: () => { this.doUnsplashSearch(resultset.query, resultset.next_page, DOMrecipient); }})
        paginationContainer.appendChild(previous);
      } else {
        const next = make('div');
        paginationContainer.appendChild(next);
      }
      DOMrecipient.appendChild(paginationContainer);
      const gallery = make('div', [this.CSS.unsplashGallery]);
      DOMrecipient.appendChild(gallery);

      // Create 3 columns
      const columnsArray = [];
      for (let i = 0; i < 3; i++) {
        const column = make('div', this.CSS.unsplashGalleryColumn);
        columnsArray.push(column);
        gallery.appendChild(column);
      }

      resultset.results.forEach((image, offset) => {
        const img = make('img', null, {
          src: image.thumb,
          onclick: () => this.downloadUnsplashImage(image),
        });
        const thumbnail = make('div', this.CSS.unsplashGalleryThumbnail);
        thumbnail.appendChild(img);
        columnsArray[offset % 3].appendChild(thumbnail);
      });
    } else {
      const noResults = make('div', null, {
        innerHTML: 'No images found',
      });
      DOMrecipient.appendChild(noResults);
    }
  }
  
  downloadUnsplashImage(image) {
    this.onEmbedUrl(image.url);
    this.fillCaption(image.attribution);
    this.unsplashClient.download(image.download_location);
    this.removeModal(document.querySelector(`.${this.CSS.modal}`));
  }

  createCaptionAltToggler() {
    const toggler = make('div', [this.CSS.toggler]);
    toggler.innerHTML = '<span class="alt">ALT</span><span class="caption">CAPTION</span>';
    toggler.addEventListener('click', () => {
      this.toggleCaptionAlt();
    })

    return toggler;
  }

  toggleCaptionAlt() {
    this.nodes.captionAltWrapper.classList.toggle('show-alt');
  }

  /**
   * Shows uploading preloader
   *
   * @param {string} src - preview source
   * @returns {void}
   */
  showPreloader(src) {
    this.nodes.imagePreloader.style.backgroundImage = `url(${src})`;

    this.toggleStatus(Ui.status.UPLOADING);
  }

  /**
   * Hide uploading preloader
   *
   * @returns {void}
   */
  hidePreloader() {
    this.nodes.imagePreloader.style.backgroundImage = '';
    this.toggleStatus(Ui.status.EMPTY);
  }

  /**
   * Shows an image
   *
   * @param {string} url - image source
   * @returns {void}
   */
  fillImage(url) {
    /**
     * Check for a source extension to compose element correctly: video tag for mp4, img — for others
     */
    const tag = /\.mp4$/.test(url) ? 'VIDEO' : 'IMG';

    const attributes = {
      src: url,
    };

    /**
     * We use eventName variable because IMG and VIDEO tags have different event to be called on source load
     * - IMG: load
     * - VIDEO: loadeddata
     *
     * @type {string}
     */
    let eventName = 'load';

    /**
     * Update attributes and eventName if source is a mp4 video
     */
    if (tag === 'VIDEO') {
      /**
       * Add attributes for playing muted mp4 as a gif
       *
       * @type {boolean}
       */
      attributes.autoplay = true;
      attributes.loop = true;
      attributes.muted = true;
      attributes.playsinline = true;

      /**
       * Change event to be listened
       *
       * @type {string}
       */
      eventName = 'loadeddata';
    }

    /**
     * Compose tag with defined attributes
     *
     * @type {Element}
     */
    this.nodes.imageEl = make(tag, this.CSS.imageEl, attributes);

    /**
     * Add load event listener
     */
    this.nodes.imageEl.addEventListener(eventName, () => {
      this.toggleStatus(Ui.status.FILLED);

      /**
       * Preloader does not exists on first rendering with presaved data
       */
      if (this.nodes.imagePreloader) {
        this.nodes.imagePreloader.style.backgroundImage = '';
      }
    });

    const previousImage = this.nodes.imageContainer.querySelector('img');
    if (previousImage) {
      this.nodes.imageContainer.removeChild(previousImage);
    }
    this.nodes.imageContainer.appendChild(this.nodes.imageEl);
  }

  /**
   * Shows caption input
   *
   * @param {string} text - caption text
   * @returns {void}
   */
  fillCaption(text) {
    if (this.nodes.caption) {
      this.nodes.caption.innerHTML = text;
    }
  }

  /**
   * Shows alt input
   * @param {string} text - alt text
   */
  fillAlt(text) {
    if (this.nodes.alt) {
      this.nodes.alt.innerHTML = text;
    }
  }

  fillLink(url) {
    this.link = url !== undefined ? url : '';
  }

  /**
   * Changes UI status
   *
   * @param {string} status - see {@link Ui.status} constants
   * @returns {void}
   */
  toggleStatus(status) {
    for (const statusType in Ui.status) {
      if (Object.prototype.hasOwnProperty.call(Ui.status, statusType)) {
        this.nodes.wrapper.classList.toggle(`${this.CSS.wrapper}--${Ui.status[statusType]}`, status === Ui.status[statusType]);
      }
    }
  }

  /**
   * Apply visual representation of activated tune
   *
   * @param {string} tuneName - one of available tunes {@link Tunes.tunes}
   * @param {boolean} status - true for enable, false for disable
   * @returns {void}
   */
  applyTune(tuneName, status) {
    this.nodes.wrapper.classList.toggle(`${this.CSS.wrapper}--${tuneName}`, status);
  }
}

