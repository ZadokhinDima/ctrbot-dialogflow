import { Logger } from '@restify-ts/logger';
import { Card } from 'dialogflow-fulfillment'
import { ProductLookupService } from '../service/product-lookup.service';
import { DialogflowConversation, Image, List } from 'actions-on-google';

export class ProductLookupIntentHandler {

    constructor(private agent: WebhookClient, private log: Logger) { }

    /**
     *  Handles product lookup intent
     */
    public handleProductLookup() {
        return async () => {
            let intentContextParams = this.agent.contexts[0].parameters;
            let productDetails = intentContextParams['ctc-product'];

            if (productDetails.toLowerCase().includes('ok') || productDetails.toLowerCase().includes('thank')) {
                // lets close product lookup intent
                this.agent.add('My pleasure!');
                this.agent.clearOutgoingContexts();
            } else {
                try {
                    const response = await ProductLookupService.getProductSuggestions(productDetails);
                    this.handleProductLookupResponse(response, productDetails);
                } catch (error) {
                    this.log.error(error);
                    this.agent.add(`I'm really sorry, but something wrong happened when I tried to find a product '${productDetails}' ;(`);
                }
            }
        }
    }
    
    

    private handleProductLookupResponse(response: any, productDetails: string) {
        if (response.products.length > 0) {
            //const productCodes: string = response.products.map((product: any) => product.productCode.replace('P', '')).join(',');
            
            this.agent.setContext({
                name: 'search-results',
                lifespan: 2,
                parameters: {products: response.products.map((product: any) => product.productCode.replace('P', ''))}
            });

            this.agent.add(`Hello, please take a look what I was able to find for '${productDetails}':`);
            const source: string = this.agent.requestSource;
            if (source && this.agent.requestSource.toLocaleLowerCase().includes('google')) {
                this.addActionsOnGoogleResponse(response.products);
            } else {
                this.addFacebookResponse(response.products);
            }

        } 
        else {
            this.agent.add(`I'm really sorry, was able to find something related to '${productDetails}':`)
        }
    }

    private addFacebookResponse(products: any[]) {
        for (let product of products) {
            let productUrl = product.searchLink
            let productCode = product.productCode.replace('P', '')
            let card = this.createFacebookCard(product.label, this.getProductImgUrl(productCode), productUrl)
            this.agent.add(card)
        }
    }

    private addActionsOnGoogleResponse(products: any[]) {
        const conversation: DialogflowConversation = this.agent.conv();
        conversation.ask('Hello, please take a look what I was able to find for you:');
        
        const items: any = {};
        

        for (let product of products) {
            items[product.productCode.replace('P', '')] = {
                  title: product.label,
                  image: new Image({
                    url: this.getProductImgUrl(product.productCode),
                    alt: 'Image alternate text',
                  })
            }
        }
        conversation.ask(new List(
            {
                title: 'Suggested products:',
                items: items
            }));
        

        this.agent.add(conversation);
    }

    private createFacebookCard(title: string, imageUrl: string, productUrl: string): Card {
        let card: Card = new Card({ title: title, imageUrl: imageUrl });
        card.setButton({ text: 'Go for product', url: this.getProductSearchUrl(productUrl) });
        return card;
    }

    private getProductImgUrl(productCode: string): string {
        const S7_BASE_URL = process.env['S7_BASE_URL'] as string;
        return `${S7_BASE_URL}${productCode.replace('P', '')}_1`;
    }

    private getProductSearchUrl(productUrl: string): string {
        const SITE_BASE_URL = process.env['SITE_BASE_URL'] as string;
        return SITE_BASE_URL + productUrl;
    }

}