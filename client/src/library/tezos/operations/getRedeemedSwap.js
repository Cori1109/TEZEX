import { ConseilDataClient } from "conseiljs";
import config from "../../../globalConfig.json";

const parseValue = (e) => {
  const splt = e.parameters.split(" ");
  return {
    ...e,
    parameters: {
      hashedSecret: splt[1],
      secret: splt[2],
    },
  };
};

const getRedeemedSecret = async (hashedSecret) => {
  const data = await ConseilDataClient.executeEntityQuery(
    config.tezos.conseilServer,
    "tezos",
    config.tezos.network,
    "operations",
    {
      fields: ["timestamp", "source", "parameters_entrypoints", "parameters"],
      predicates: [
        {
          field: "kind",
          operation: "eq",
          set: ["transaction"],
          inverse: false,
        },
        {
          field: "timestamp",
          operation: "after",
          set: [1599984675000],
          inverse: false,
        },
        { field: "status", operation: "eq", set: ["applied"], inverse: false },
        {
          field: "destination",
          operation: "eq",
          set: [config.tezos.contractAddr],
          inverse: false,
        },
        {
          field: "parameters_entrypoints",
          operation: "eq",
          set: ["redeem"],
          inverse: false,
        },
      ],
      orderBy: [{ field: "timestamp", direction: "desc" }],
      aggregation: [],
      limit: 1000,
    }
  );
  for (let i = 0; i < data.length; ++i) {
    const swp = parseValue(data[i]);
    if (swp.parameters.hashedSecret === hashedSecret)
      return swp.parameters.secret;
  }
  return "";
};

export default getRedeemedSecret;
