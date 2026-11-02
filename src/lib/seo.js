export const TITLE = "Trash Can Valet in Gilbert, AZ | Gilbert Curb Valet";
export const DESCRIPTION =
  "We roll your trash and recycling carts to the curb the night before pickup and bring them back. Gilbert, AZ. $29 first month, then $39/mo. Join the list.";

// LocalBusiness with no street address or phone: Josh works from home and has no business line yet.
export function buildJsonLd(site) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.name,
    url: site.url,
    description: `${site.name} rolls your trash and recycling carts to the curb the night before pickup in ${site.city}, ${site.region}, then brings them back that evening.`,
    priceRange: `$${site.priceFirstMonth}–$${site.priceMonthly}/mo`,
    areaServed: { "@type": "City", name: `${site.city}, ${site.region}` },
    parentOrganization: { "@type": "Organization", name: site.legalName },
    makesOffer: {
      "@type": "Offer",
      name: "Trash can valet",
      price: String(site.priceMonthly),
      priceCurrency: "USD",
      description: `$${site.priceFirstMonth} for the first month, then $${site.priceMonthly} a month, up to ${site.maxCarts} carts.`,
    },
  };
}
