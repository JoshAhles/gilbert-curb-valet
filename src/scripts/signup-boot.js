import { wire } from "./signup-form.js";
import { SITE } from "../data/site.js";
document.querySelectorAll("form[data-signup]").forEach((f) => wire(f, { endpoint: SITE.formspreeEndpoint }));
