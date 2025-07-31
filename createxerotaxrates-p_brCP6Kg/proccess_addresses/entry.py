def handler(pd: "pipedream"):
    # Retrieve customer data
    customers = pd.steps["get_xero_customers"]["$return_value"]["allContacts"]

    # Initialize lists
    unique_street_addresses = []
    client_names_incomplete_street = []
    clients_without_country = []

    # Variations of "USA" to consider
    usa_variations = {"USA", "United States", "US", "United States of America"}

    seen_addresses = set()  # To track already added addresses

    for customer in customers:
        for address in customer.get("Addresses", []):
            if address.get("AddressType") == "STREET":
                country = address.get("Country", "").strip()
                street = address.get("AddressLine1", "").strip()
                city = address.get("City", "").strip()
                region = address.get("Region", "").strip()
                postal_code = address.get("PostalCode", "").strip()

                # List 1: Unique street addresses where all fields are populated and country is a variation of "USA"
                if country in usa_variations and all([street, city, region, postal_code]):
                    shipping_address = {
                        "city": city,
                        "country": country,
                        "zip": postal_code,
                        "state": region,
                        "street": street,
                    }
                    # Avoid duplicates
                    address_tuple = tuple(shipping_address.values())
                    if address_tuple not in seen_addresses:
                        unique_street_addresses.append(shipping_address)
                        seen_addresses.add(address_tuple)

                # List 2: Client names where street fields are not all populated and country is a variation of "USA"
                elif country in usa_variations:
                    if not all([street, city, region, postal_code]):
                        client_names_incomplete_street.append(customer["Name"])

                # List 3: Client names where no country is mentioned
                if not country:
                    clients_without_country.append(customer["Name"])

    # Remove duplicates from lists
    client_names_incomplete_street = list(set(client_names_incomplete_street))
    clients_without_country = list(set(clients_without_country))

    # Return the three lists
    return {
        "unique_street_addresses": unique_street_addresses,
        "client_names_incomplete_street": client_names_incomplete_street,
        "clients_without_country": clients_without_country,
    }
