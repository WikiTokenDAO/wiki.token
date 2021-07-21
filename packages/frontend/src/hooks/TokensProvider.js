import { useState, useEffect } from "react";

import axios from "axios";
import { BigNumber } from "@ethersproject/bignumber";

function useTokensProvider(tokensResult) {
  const [tokens, setTokens] = useState([]);

  useEffect(() => {
    if (!tokensResult || tokensResult.length !== 3) {
      return;
    }
    Promise.all(
      tokensResult[0].map(token => {
        return axios
          .get(
            `${process.env.REACT_APP_METADATA_API_BASE_URL}/api/token/${BigNumber.from(
              token,
            ).toNumber(token)}`,
          )
          .then(res => res.data);
      }),
    ).then(tokens => {
      setTokens(tokens);
    });
  }, [tokensResult]);

  return tokens;
}

export default useTokensProvider;
