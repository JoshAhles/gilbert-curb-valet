// Single source of business facts. Copy, structured data and forms all read from here.
export const SITE = {
  name: "Gilbert Curb Valet",
  legalName: "CodeBucky LLC",
  url: "https://gilbertcurbvalet.com",
  city: "Gilbert",
  region: "AZ",
  priceFirstMonth: 29,
  priceMonthly: 39,
  maxCarts: 2,
  formspreeEndpoint: "https://formspree.io/f/xzeekpyn",
  contactEmail: "hello@gilbertcurbvalet.com",
  gaId: import.meta.env?.PUBLIC_GA_ID ?? "",
  townScheduleUrl: "https://www.gilbertaz.gov/how-do-i/view/trash-recycling-pickup-schedules",
};
