const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const TAKPItemSearch = require('./TAKPItemSearch');
const QUARMItemSearch = require('./QUARMItemSearch');

const defaultSearcher = 'quarm';

module.exports = class ItemSearch {
    constructor() {
        this.takpItemSearch = new TAKPItemSearch();
        this.quarmItemSearch = new QUARMItemSearch();
    }

    async searchItem(search, searcher = defaultSearcher) {
        if (searcher === 'takp') {
            return this.takpItemSearch.searchItem(search);
        }
        if (searcher === 'quarm') {
            return this.quarmItemSearch.searchItem(search);
        }
        return null;
    }

    async searchItemById(id, searcher = defaultSearcher) {
        if (searcher === 'takp') {
            return this.takpItemSearch.searchItemById(id);
        }
        if (searcher === 'quarm') {
            return this.quarmItemSearch.searchItemById(id);
        }
        return null;
    }

}