const jsdom = require('jsdom');
const { JSDOM } = jsdom;

module.exports = class QUARMItemSearch {
    constructor() {
    }

    async searchItem(search) {
        //check if search is a number
        const isNumber = /^\d+$/.test(search);
        if (isNumber) {
            return this.searchItemById(search);
        }

        const searchUrl = `https://www.pqdi.cc/api/v1/items?name=${search}`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        console.log(data);

        if (data.items && data.items.length > 1) {
            return data.items;
        }

        if (data.items && data.items.length === 1) {
            const item = data.items[0];
            return this.searchItemById(item.id);
        }

        return null;
    }

    //function to extract the icon number from the title attribute like: title="Icon 1234"
    extractIconNumber(element) {
        const title = element.getAttribute('title');
        const iconNumber = title.split(' ')[1];
        return iconNumber;
    }

    processItem(html, id = '') {
        const dom = new JSDOM(html);
        const itemStats = dom.window.document.querySelector('table');
        const itemIconElement = dom.window.document.querySelector('.item-icon');
        const iconNumber = this.extractIconNumber(itemIconElement);
        const itemName = dom.window.document.querySelector('h4').textContent;

        let itemStatsHtml = itemStats.innerHTML;
        //remove item name from stats
        itemStatsHtml = itemStatsHtml.replace(itemName, '');

        // replace all br tags with newlines
        let itemStatsText = itemStatsHtml.replace(/<br>/g, '\n');
        //replace all closing paragraph tags with newlines
        itemStatsText = itemStatsText.replace(/<p>/g, '\n');
        itemStatsText = itemStatsText.replace(/<\/p>/g, '\n');
        //replace all rows with newlines
        itemStatsText = itemStatsText.replace(/<tr>/g, '\n');
        itemStatsText = itemStatsText.replace(/<\/tr>/g, '\n');
        //remove all other html tags
        itemStatsText = itemStatsText.replace(/<[^>]*>/g, '');
        //remove more than 2 newlines
        itemStatsText = itemStatsText.replace(/\n{2,}/g, '\n');

        const item = {
            id: id.toString(),
            name: itemName,
            data: itemStatsText,
            image: `https://www.takproject.net/allaclone/icons/item_${iconNumber}.gif`,
            url: `https://www.pqdi.cc/item/${id}`,
        };

        return item;
    }

    async searchItemById(id) {
        const searchUrl = `https://www.pqdi.cc/get-item-tooltip/${id}`;
        const response = await fetch(searchUrl);
        const data = await response.text();

        if (data.includes('table')) {
            return this.processItem(data, id);
        }

        return null;
    }

}