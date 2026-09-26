/** Where businesses send their transfers. Placeholders until Giorgi fills in
 *  the real requisites.
 *
 *  Lives beside page.tsx rather than in it: Next.js rejects unknown exports
 *  from a page file at build time. */
export const PAYMENT_DETAILS = {
  legalName: 'შ.პ.ს. „...“', // TODO
  taxId: '...', // TODO
  address: '...', // TODO
  accounts: [
    { bank: 'სს „თიბისი ბანკი“', iban: 'GE...' }, // TODO
    { bank: 'სს „საქართველოს ბანკი“', iban: 'GE...' }, // TODO
  ],
}
