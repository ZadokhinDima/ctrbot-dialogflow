import * as request from 'request-promise-native'
import { Logger } from '@restify-ts/logger';
import { Card } from 'dialogflow-fulfillment'

export class ProductLookupIntentHandler {

    constructor(private agent: WebhookClient, private log: Logger) { }

    /**
     *  Handles product lookup intent
     */
    public handleProductLookup() {
        const ENDPOINT_PRODUCT_LOOKUP = process.env['ENDPOINT_PRODUCT_LOOKUP'] as string
        return async () => {
            let intentContextParams = this.agent.contexts[0].parameters
            let productDetails = intentContextParams['ctc-product']

            let options = {
                uri: ENDPOINT_PRODUCT_LOOKUP,
                qs: {
                    q: productDetails,
                },
                json: true
            }
            await request.get(options)
                .then((response) => {
                    this.handleProductLookupResponse(response, productDetails)
                }).catch(error => {
                    this.log.error(error)
                    this.agent.add(`I'm really sorry, but something wrong happened when I tried to find a product '${productDetails}' ;(`)
                })
        }
    }

    private createCard(title: string, imageUrl: string, productUrl: string) {
        const SITE_BASE_URL = process.env['SITE_BASE_URL'] as string
        let card = new Card({ title: title, imageUrl: imageUrl })
        card.setButton({ text: 'Go for product', url: SITE_BASE_URL + productUrl })
        return card
    }

    private handleProductLookupResponse(response: any, productDetails: string) {
        if (response.products) {
            this.agent.add(`Hello, please take a look what I was able to find for '${productDetails}':`)
            for (let product of response.products) {
                let productUrl = product.searchLink
                let productCode = product.productCode.replace('P', '')
                const S7_BASE_URL = process.env['S7_BASE_URL'] as string
                let imgUrl = `${S7_BASE_URL}${productCode}_1`
                let card = this.createCard(product.label, imgUrl, productUrl)
                this.log.debug({ card: card })
                this.agent.add(card)
            }
        } else {
            this.agent.add(`I'm really sorry, was able to find something related to '${productDetails}':`)
        }
    }

}