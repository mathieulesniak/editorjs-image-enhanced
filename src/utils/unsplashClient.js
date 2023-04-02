import axios from "axios";

/**
 * Client for Unsplash API
 */
export default class UnsplashClient {
  constructor(config) {
    this.apiUrl =
      config && config.apiUrl ? config.apiUrl : "https://api.unsplash.com";
    this.clientId = config && config.clientId ? config.clientId : "";
    this.perPage = config && config.maxResults ? config.maxResults : 40;
    this.appName = config && config.appName ? config.appName : "";
  }

  search(query, page = 1, callback) {
    axios
      .get(`${this.apiUrl}/search/photos`, {
        params: {
          client_id: this.clientId,
          query,
          page,
          per_page: this.perPage,
        },
      })
      .then((response) => callback(this.parseResults(response.data, page, query)))
      .catch(() => callback([]));
  }

  parseResults({ total, total_pages, results }, page, query) {
    return {
      total,
      total_pages,
      page,
      next_page: total_pages > page ? page + 1 : null,
      previous_page: page > 1 ? page - 1 : null,
      query,
      results: results.map((image) => ({
        url: image.urls.regular,
        thumb: image.urls.thumb,
        download_location: image.links.download_location,
        attribution: `Photo by <a href="${image.user.links.html}?utm_source=${this.appName}&utm_medium=referral">${image.user.name}</a> on <a href="https://unsplash.com/?utm_source=${this.appName}&utm_medium=referral">Unsplash</a>`
      })),
    };
  }

  /**
   * Trigger an image download, as Unsplash API requires it when embedding
   * @param {string} downloadLocation 
   */
  download(downloadLocation) {
    axios.get(downloadLocation, {
        params: {
          client_id: this.clientId,
        },
      }).catch((error) => console.log(error));
  }
}
