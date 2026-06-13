/**
 * Trade order logic — Admin API calls for customer + draft order creation.
 */

function splitName(full) {
  const parts = (full || "").trim().split(/\s+/);
  return {
    firstName: parts[0] || "Trade",
    lastName: parts.slice(1).join(" ") || "Customer",
  };
}

function gqlErrors(data, key) {
  const errors = data?.[key]?.userErrors;
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

async function gql(admin, query, variables) {
  const response = await admin.graphql(query, { variables });
  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  return json.data;
}

async function findCustomerByEmail(admin, email) {
  const data = await gql(
    admin,
    `#graphql
    query FindCustomer($query: String!) {
      customers(first: 1, query: $query) {
        nodes { id email }
      }
    }`,
    { query: "email:" + email }
  );
  return data.customers.nodes[0] || null;
}

async function createCustomer(admin, payload) {
  const name = splitName(payload.contact_name);
  const noteParts = ["Company: " + (payload.company_name || "")];
  if (payload.instagram) noteParts.push("Instagram: " + payload.instagram);
  if (payload.website) noteParts.push("Website: " + payload.website);

  const data = await gql(
    admin,
    `#graphql
    mutation CustomerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer { id email }
        userErrors { field message }
      }
    }`,
    {
      input: {
        email: payload.email,
        firstName: name.firstName,
        lastName: name.lastName,
        tags: ["trade-show", "wholesale"],
        note: noteParts.join("\n"),
      },
    }
  );

  gqlErrors(data, "customerCreate");
  return data.customerCreate.customer;
}

async function updateCustomer(admin, customerId, payload) {
  const name = splitName(payload.contact_name);
  const noteParts = ["Company: " + (payload.company_name || "")];
  if (payload.instagram) noteParts.push("Instagram: " + payload.instagram);
  if (payload.website) noteParts.push("Website: " + payload.website);

  const data = await gql(
    admin,
    `#graphql
    mutation CustomerUpdate($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer { id }
        userErrors { message }
      }
    }`,
    {
      input: {
        id: customerId,
        firstName: name.firstName,
        lastName: name.lastName,
        tags: ["trade-show", "wholesale"],
        note: noteParts.join("\n"),
      },
    }
  );

  gqlErrors(data, "customerUpdate");
}

async function createDraftOrderCheckout(admin, customerId, payload) {
  const lineItems = (payload.lineItems || []).map((item) => ({
    title: item.title,
    quantity: item.quantity,
    originalUnitPrice: String(item.unitPrice),
    customAttributes: item.attributes || [],
  }));

  if (!lineItems.length) {
    throw new Error("No valid line items in order");
  }

  const email = payload.email.trim().toLowerCase();

  const draftData = await gql(
    admin,
    `#graphql
    mutation DraftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder { id name invoiceUrl }
        userErrors { field message }
      }
    }`,
    {
      input: {
        customerId,
        email,
        lineItems,
        note: payload.note || "",
        tags: ["trade-show", "trade-order-form"],
        customAttributes: [
          { key: "company_name", value: payload.company_name || "" },
          { key: "source", value: "Trade Show Order Form" },
        ],
      },
    }
  );

  gqlErrors(draftData, "draftOrderCreate");
  const draftOrder = draftData.draftOrderCreate.draftOrder;

  if (!draftOrder.invoiceUrl) {
    throw new Error("Could not create checkout link — please contact support");
  }

  return {
    draftOrderId: draftOrder.id,
    draftOrderName: draftOrder.name,
    checkoutUrl: draftOrder.invoiceUrl,
  };
}

/**
 * Main entry — called from the app proxy route with an Admin API client.
 */
export async function createTradeOrder(admin, payload) {
  if (!payload.email || !payload.contact_name || !payload.company_name) {
    throw new Error("Missing required fields: email, contact name, or company name");
  }

  const email = payload.email.trim().toLowerCase();
  let customer = await findCustomerByEmail(admin, email);

  if (customer) {
    await updateCustomer(admin, customer.id, payload);
  } else {
    customer = await createCustomer(admin, payload);
  }

  const order = await createDraftOrderCheckout(admin, customer.id, payload);

  return {
    success: true,
    customerId: customer.id,
    customerEmail: email,
    draftOrderId: order.draftOrderId,
    draftOrderName: order.draftOrderName,
    checkoutUrl: order.checkoutUrl,
  };
}
