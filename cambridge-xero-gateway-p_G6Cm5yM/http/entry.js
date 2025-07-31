import { axios } from "@pipedream/platform";
export default defineComponent({
    props: {
        xero_accounting_api_production: {
            type: "app",
            app: "xero_accounting_api"
        }
    },
    async run({ steps, $ }) {
        let tenant_map = {
 
           "e3dca7b6-a047-485a-a045-6ef0ab57004d": {
                app: this.xero_accounting_api_production,
                name: "Complyt Production (US)",
                //subsidiary: null,
                subsidiary: "complyt-us-sub",
                tax_code_map: {
                    "TPP": "PC29",
                    "PM-BR": "C3S1",
                    "GB1-White": "C3S1",
                    "GB3-White": "C3S1",
                    "GB6-White": "C3S1",
                    "GB9-White": "C3S1",
                    "BOOK": "C3S1",
                    "TSL - Black": "C3S1",
                    "TSM - Black": "C3S1",
                    "Train-MS": "C3S1",
                    "Support-M": "C3S1",
                    "Temp": "C3S1",
                    "Ignore": "Ignore",
                    "default_tax_code": "C3S1", 
                    "SaaS": "C3S1"
                },
                tax_rate_type_map: {
                    requested: "TAX001",
                    calculated: "TAX002",
                    exempted: "TAX003"
                },
                complyt_client_id: process.env.client_id_complyt,
                complyt_client_secret: process.env.client_secret_complyt,
                complyt_api_environment: "demo"
            },

          
          
            "2c7f26cf-f834-4f11-8da9-d827bde7e8fe": {
                app: this.xero_accounting_api_production,
                name: "Tappit Technologies (US) Inc",
                subsidiary: null,
                tax_code_map: {
                    "10001": "PC45",
                    "10002": "PC45",
                    "10003": "PC49",
                    "10004": "PC50",
                    "10005": "PC47",
                    "10006": "PC45",
                    "10007": "PC49",
                    "10052": "PC46",
                    "10053": "PC46",
                    "10054": "NTX1",
                    "10055": "PC17",
                    "10056": "PC48",
                    "10057": "PC46",
                    "10058": "PC46",
                    "10059": "PC46",
                    "10060": "NTX1",
                    "10061": "PC17",
                    "10062": "PC48",
                    "10063": "PC46",
                    "10064": "PC47",
                    "10065": "PC49",
                    "10066": "NTX1",
                    "10067": "PC16",
                    "10068": "PC50",
                    "10069": "",
                    "10051": "PC45",
                    "10101": "PC45",
                    "10102": "",
                    "License Fees (Recurring)": "PC45"
                },
                tax_rate_type_map: {
                    requested: "TAX007",
                    calculated: "TAX008",
                    exempted: "TAX009"
                },
                complyt_client_id: process.env.client_id_tappit,
                complyt_client_secret: process.env.client_secret_tappit,
                complyt_api_environment: "api"
            },

          
          
            "ba23a916-bbf5-453f-9293-193ad7859a0e": {
                app: this.xero_accounting_api_production,
                name: "Pointr USA Limited",
                subsidiary: null,
                tax_code_map: {
                    "HW_INSTALL": "C1S1",
                    "LICENSE_ASSET_TRACKING": "C3S1",
                    "LICENSE_BD_GEO": "C3S1",
                    "LICENSE_M_W_ADV": "C3S1",
                    "LICENSE_M_W_STD": "C3S1",
                    "TRAVEL_DOM": "C3S1X",
                    "TRAVEL_INT": "C3S1X",
                    "MAPPING": "C4S1",
                    "PILOT": "PC20",
                    "SUPPORT_ADV": "PC20",
                    "SUPPORT_STD": "PC20",
                    "SETUP_BLUE_DOT": "PC21",
                    "SETUP_WAYFINDING": "PC21",
                    "HOSTING": "PC23"
                },
                tax_rate_type_map: {
                    requested: "TAX010",
                    calculated: "TAX011",
                    exempted: "TAX012"
                },
                complyt_client_id: process.env.client_id_pointr,
                complyt_client_secret: process.env.client_secret_pointr,
                complyt_api_environment: "api"
            },
          
                "90b8cb04-d4ff-4339-9c3d-057df5bad13d": {
                  "app": this.xero_accounting_api_production,
                  "name": "Zeelo Inc",
                  "subsidiary": "Zeelo Inc.",
                  "tax_code_map": {
                    "a": "",
                    "b": "",
                    "c": "",
                    "d": "",
                    "e": "",
                    "January 5th to 10th": "",
                    "Management Services (CIM)": "PS01",
                    "Management Services (COOM)": "PS01",
                    "Management Services (MIM)": "PS01",
                    "Management Services (MOOM)": "PS01",
                    "Program Services (CIM)": "PS03",
                    "Program Services (COOM)": "PS03",
                    "Program Services (MIM)": "PS03",
                    "Program Services (MOOM)": "PS03",
                    "Transportation Services (CIM)": "PS02",
                    "Transportation Services (COOM)": "PS02",
                    "Transportation Services (MIM)": "PS02",
                    "Transportation Services (MOOM)": "PS02"
                  },
                  "tax_rate_type_map": {
                    "requested": "TAX001",
                    "calculated": "TAX002",
                    "exempted": "NONE"
                  },
                  "complyt_client_id": process.env.client_id_zeelo,
                  "complyt_client_secret": process.env.client_secret_zeelo,
                  "complyt_api_environment": "api"
                },
                "7ec7d79d-c66d-4d3b-9c98-252bdd7da432": {
                  "app": this.xero_accounting_api_production,
                  "name": "Zeelo Commute Inc.",
                  "subsidiary": "Zeelo Commute Inc.",
                  "tax_code_map": {
                    "Management Services (CIM)": "PS01",
                    "Management Services (COOM)": "PS01",
                    "Management Services (MIM)": "PS01",
                    "Management Services (MOOM)": "PS01",
                    "Program Services (CIM)": "PS03",
                    "Program Services (COOM)": "PS03",
                    "Program Services (MIM)": "PS03",
                    "Program Services (MOOM)": "PS03",
                    "Transportation Services (CIM)": "PS02",
                    "Transportation Services (COOM)": "PS02",
                    "Transportation Services (MIM)": "PS02",
                    "Transportation Services (MOOM)": "PS02"
                  },
                  "tax_rate_type_map": {
                    "requested": "TAX001",
                    "calculated": "TAX002",
                    "exempted": "NONE"
                  },
                  "complyt_client_id": process.env.client_id_zeelo,
                  "complyt_client_secret": process.env.client_secret_zeelo,
                  "complyt_api_environment": "api"
                },
          
            "f03ce5a2-b685-4014-8074-697f42e699c7": {
                app: this.xero_accounting_api_production,
                name: "Black Swan Data Inc.",
                subsidiary: null,
                tax_code_map: {
                    "001": "C3S1",
                    "002": "PC18",
                    "003": "C3S1X",
                    "004": "C3S1X",
                    "005": ""
                },
                tax_rate_type_map: {
                    requested: "TAX001",
                    calculated: "TAX002",
                    exempted: "TAX003"
                },
                complyt_client_id: process.env.client_id_blackswan,
                complyt_client_secret: process.env.client_secret_blackswan,
                complyt_api_environment: "api"
            },
          
          "40ca6e24-b918-47ad-aa26-4223048a5594": {
                app: this.xero_accounting_api_production,
                name: "ROLZO Inc",
                subsidiary: null,
                tax_code_map: {
                },
                tax_rate_type_map: {
                    requested: "TAX002",
                    calculated: "TAX003",
                    exempted: "NONE"
                },
                complyt_client_id: process.env.client_id_rolzo,
                complyt_client_secret: process.env.client_secret_rolzo,
                complyt_api_environment: "api"
            },

          

           "aa735101-47e1-4d08-ad82-aa99c1597497": {
                app: this.xero_accounting_api_production,
                name: "Lineten USA",
                subsidiary: null,
                tax_code_map: {
                    "001": "C3S1",
                    "002": "C3S1",
                    "003": "C3S1X",
                    "004": "PC48"
                },
                tax_rate_type_map: {
                    requested: "TAX002",
                    calculated: "TAX003",
                    exempted: "TAX004"
                },
                complyt_client_id: process.env.client_id_lineten,
                complyt_client_secret: process.env.client_secret_lineten,
                complyt_api_environment: "api"
            },

          
           "a39fdc45-bbf1-45d6-8cb7-6b2e5686da2f": {
                app: this.xero_accounting_api_production,
                name: "Inspera USA Inc.",
                subsidiary: null,
                tax_code_map: {
                  "100": "C3S1",
                  "101": "C3S1",
                  "102": "C3S1",
                  "103": "C3S1",
                  "104": "C3S1",
                  "105": "C3S1",
                  "106": "C3S1",
                  "107": "C3S1",
                  "108": "C3S1",
                  "109": "C3S1",
                  "110": "C3S1",
                  "111": "C3S1",
                  "112": "C3S1",
                  "113": "C3S1",
                  "114": "C3S1",
                  "115": "C3S1",
                  "116": "C3S1",
                  "117": "C3S1",
                  "118": "C3S1",
                  "119": "C3S1",
                  "120": "C3S1",
                  "121": "C3S1",
                  "122": "C3S1",
                  "123": "C3S1",
                  "124": "C3S1",
                  "200": "PC44",
                  "201": "PC44",
                  "202": "PC22",
                  "203": "PC22",
                  "204": "PC22",
                  "205": "PC22",
                  "206": "PC22",
                  "207": "PC22",
                  "208": "PC22",
                  "209": "PC22",
                  "210": "C3S1",
                  "211": "PC48",
                  "212": "PC48",
                  "213": "PC48",
                  "214": "PC48",
                  "215": "PC48",
                  "216": "PC48",
                  "217": "C3S1",
                  "218": "C3S1",
                  "219": "C3S1",
                  "220": "PC48",
                  "221": "C3S1",
                  "222": "PC48",
                  "300": "C3S1",
                  "301": "C3S1",
                  "302": "C9S1",
                  "303": "C9S1",
                  "304": "C9S1",
                  "305": "C9S1",
                  "400": "C3S1",
                  "401": "C3S1",
                  "600": "C3S1",
                  "601": "PC48",
                  "602": "PC48",
                  "603": "PC48",
                  "604": "PC48",
                  "605": "PC48",
                  "606": "PC48",
                  "607": "PC48",
                  "608": "PC48",
                  "609": "PC48",
                  "610": "PC48",
                  "611": "PC48",
                  "700": "PC44",
                  "701": "PC44",
                  "702": "PC44",
                  "703": "PC44",
                  "704": "C3S1",
                  "800": "C3S1",
                  "900": "PC46",
                  "901": "PC46",
                  "902": "C3S1X",
                  "903": "C3S1X",
                  "904": "C3S1X",
                  "905": "PC46",
                  "906": "PC46"
                },
                tax_rate_type_map: {
                    requested: "TAX001",
                    calculated: "TAX002",
                    exempted: "NONE"
                },
                complyt_client_id: process.env.client_id_inspera,
                complyt_client_secret: process.env.client_secret_inspera,
                complyt_api_environment: "api"
            },
           "deed4fec-5dcc-4603-8b01-418c9b0fc9d6": {
                app: this.xero_accounting_api_production,
                name: "Cambridge Intelligence Inc",
                subsidiary: null,
                tax_code_map:{
                  "ADP Healthcare": "",
                  "ADP Insurance": "",
                  "Multiple Instalments (KG)": "",
                  "Multiple Instalments (KL)": "",
                  "Multiple Instalments (RG)": "",
                  "PL (KG)": "",
                  "PL (KL)": "",
                  "PL (RG)": "",
                  "PoC (KG)": "",
                  "PoC (KL)": "",
                  "PoC (RE)": "",
                  "PS (KG)": "",
                  "PS (KL)": "",
                  "PS (RG)": "",
                  "Subscription license (KG)": "",
                  "Subscription license (KL)": "",
                  "Subscription license (RG)": "",
                  "Support (KG)": "",
                  "Support (KL)": "",
                  "Support (RG)": "",
                  "U.S. Management Fees": "",
                  "US Mgmt Fee": ""
              },
                tax_rate_type_map: {
                    requested: "TAX012",
                    calculated: "TAX013",
                    exempted: "NONE"
                },
                complyt_client_id: process.env.client_id_cambridge_intelligence,
                complyt_client_secret: process.env.client_secret_cambridge_intelligence,
                complyt_api_environment: "api"
            },

          
           "c2e49364-7fd0-44ec-afad-df2da8fc9eb1": {
                app: this.xero_accounting_api_production,
                name: "DataOps.live Inc",
                subsidiary: "Inc",
                tax_code_map: {
                   "default_tax_code": "C3S1",
                   "ST": "C3S1X"
                },
                tax_rate_type_map: {
                    requested: "TAX001",
                    calculated: "TAX002",
                    exempted: "NONE"
                },
                complyt_client_id: process.env.client_id_dataOps,
                complyt_client_secret: process.env.client_secret_dataOps,
                complyt_api_environment: "api"
            },
            "52425fac-1bf9-41ac-bc01-c6e92dacf028": {
               app: this.xero_accounting_api_production,
               name: "Shufti Pro Limited",
                subsidiary: null,
                tax_code_map: {
                  "AML": "C3S1",
                  "Customisation Charges": "PC49",
                  "Data Entry": "ALT",
                  "Data Sciences": "ALT",
                  "Design Website": "ALT",
                  "E-KYC": "C3S1",
                  "HVP": "C3S1",
                  "KYB": "C3S1",
                  "KYC": "C3S1",
                  "KYC - ON PREMISES PLAN": "C3S1",
                  "KYC-Video": "C3S1",
                  "KYI": "C3S1",
                  "Payroll - Commission": "C3S1X",
                  "Payroll - Management Staff": "C3S1X",
                  "Payroll - Sales Staff": "C3S1X",
                  "Processing Charges": "CCF001",
                  "R & D Expenses": "ALT",
                  "Setup Fee - Enterprise": "PC49",
                  "Setup Fee - Startup": "PC49",
                  "Software - Development": "ALT",
                  "Support Fee": "E1S2",
                  "VAT": "C3S1X"
              },
               tax_rate_type_map: {
                   requested: "TAX005",
                   calculated: "TAX006",
                   exempted: "NONE"
               },
               complyt_client_id: process.env.client_id_shufti,
               complyt_client_secret: process.env.client_secret_shufti,
               complyt_api_environment: "api"
            },
            "c00c1704-0af5-43ad-94b2-f5ecb56c8957": {
               app: this.xero_accounting_api_production,
               name: "HICX",
               subsidiary: null,
               tax_code_map: {
                  "ANA001": "C3S1",
                  "CET001": "C3S1",
                  "ENV001": "C3S1",
                  "IMP001": "PC48",
                  "LIC001": "C3S1",
                  "MAN001": "PC44",
                  "MAN002": "PC44",
                  "POV001": "C3S1",
                  "SER001": "C3S1",
                  "SIM001": "C3S1",
                  "SPO001": "C3S1",
                  "SXP001": "C3S1",
                  "VIS001": "C3S1"
               },
               tax_rate_type_map: {
                   requested: "TAX003",
                   calculated: "TAX004",
                   exempted: "NONE"
               },
               complyt_client_id: process.env.client_id_hicx,
               complyt_client_secret: process.env.client_secret_hicx,
               complyt_api_environment: "api"
           },
          "15779bf4-a400-416d-a6bf-fe0e9b0e106a": {
               app: this.xero_accounting_api_production,
               name: "HICX Solutions Inc.",
               subsidiary: null,
                tax_code_map: {
                  "ANA001": "C3S1",
                  "CET001": "C3S1",
                  "ENV001": "C3S1",
                  "IMP001": "PC48",
                  "LIC001": "C3S1",
                  "MAN001": "PC44",
                  "MAN002": "PC44",
                  "POV001": "C3S1",
                  "SER001": "C3S1",
                  "SIM001": "C3S1",
                  "SPO001": "C3S1",
                  "SXP001": "C3S1",
                  "VIS001": "C3S1"
               },
               tax_rate_type_map: {
                   requested: "TAX004",
                   calculated: "TAX005",
                   exempted: "NONE"
               },
               complyt_client_id: process.env.client_id_hicx,
               complyt_client_secret: process.env.client_secret_hicx,
               complyt_api_environment: "api"
           },
           "a4f5e7ef-7d98-461b-b26d-5a5cc15ceacd": {
                app: this.xero_accounting_api_production,
                name: "DataOps Software Limited",
                subsidiary: "Ltd",
                tax_code_map: {
                   "default_tax_code": "C3S1",
                   "ST": "C3S1X"
                },
                tax_rate_type_map: {
                    requested: "TAX003",
                    calculated: "TAX004",
                    exempted: "EXEMPTOUTPUT"
                },
                complyt_client_id: process.env.client_id_dataOps,
                complyt_client_secret: process.env.client_secret_dataOps,
                complyt_api_environment: "api"
            }

            //   "TENANT_ID": {
            //     app: this.xero_accounting_api_production,
            //     name: "<CLIENT_NAME>",
            //     subsidiary: "<SUBSIDIARY_NAME>",
            //     tax_code_map: {

            //     },
            //     tax_rate_type_map: {
            //         // These tax codes varies in each client's Xero. Please check
            //         requested: "TAX002",
            //         calculated: "TAX003",
            //         exempted: "TAX004"
            //     },
            //     complyt_client_id: process.env.client_id_<CLIENT_NAME>,
            //     complyt_client_secret: process.env.client_secret_<CLIENT_NAME>,
            //     complyt_api_environment: "api"
            // }

        }

       let tenantId = steps.trigger.event?.tenantId || steps.trigger.event?.body?.tenantId;
        if (!tenantId || !tenant_map[tenantId]) {
            console.error(`Tenant details not found for tenantId: ${tenantId}`);
            $.flow.exit(`Stopping the workflow as the Tenant details not found for tenantId: ${tenantId}`);
            return;  // Ensure the function exits after the error
        }
      
        let tenant_details = tenant_map[tenantId];

        console.log("Client Name: ", tenant_details.name);
        console.log("Tenant details:", tenant_details);


        // Determine the event details to support both triggers
        let event_details = steps.trigger.event?.body || steps.trigger.event;
        console.log("Event details:", event_details);

        // Retrieve auto_assessment header if available
        let auto_assessment = steps.trigger.event.headers?.auto_assessment || false;
        console.log("auto assessment details:", auto_assessment);

        if (event_details.eventCategory === "INVOICE") {
            // Send to Transactions Flow:
            return await axios($, {
                method: "POST",
                url: 'https://eo6aerpozvvbepl.m.pipedream.net',
                headers: {
                    xero_token: tenant_details.app.$auth.oauth_access_token,
                    new_xero_token: steps["getAccessToken"]["$return_value"]["access_token"],
                    complyt_client_id: tenant_details.complyt_client_id,
                    complyt_client_secret: tenant_details.complyt_client_secret,
                    complyt_api_environment: tenant_details.complyt_api_environment
                },
                data: {
                    tax_code_map: tenant_details.tax_code_map,
                    event_details: event_details,
                    tax_rate_type_map: tenant_details.tax_rate_type_map,
                    name: tenant_details.name,
                    subsidiary: tenant_details.subsidiary,
                    auto_assessment: auto_assessment
                }
            });
        } else {
            // Send to customer flow
            return await axios($, {
                method: "POST",
                url: 'https://eoxy7ccl90kbn00.m.pipedream.net',
                headers: {
                    xero_token: tenant_details.app.$auth.oauth_access_token,
                    new_xero_token: steps["getAccessToken"]["$return_value"]["access_token"],
                    complyt_client_id: tenant_details.complyt_client_id,
                    complyt_client_secret: tenant_details.complyt_client_secret,
                    complyt_api_environment: tenant_details.complyt_api_environment
                },
                data: {
                    event_details: event_details,
                    name: tenant_details.name
                }
            });
        }
    }
});