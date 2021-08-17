import React, { useState, useEffect } from "react";

import "antd/dist/antd.css";
import { Alert, Button, Form, Input } from "antd";
import axios from "axios";
import { BigNumber } from "@ethersproject/bignumber";
import web3 from "web3";

import { Token } from "../components";
import { MINT_FEE } from "../constants";
import { useWikiTokenContract } from "../hooks";
import { useContractFunction, useEthers } from "@usedapp/core";

// Form validation status
const VALIDATE_STATUS_IDLE = "idle";
const VALIDATE_STATUS_SUCCESS = "success";
const VALIDATE_STATUS_VALIDATING = "validating";
const VALIDATE_STATUS_ERROR = "error";

const STATE_MINING = "Mining";

const REFRESH_DELAY_MS = 200;
const DEBOUNCE_DELAY_MS = 300;

export default function Sponsor() {
  const [validateStatus, setValidateStatus] = useState("");
  const [articleQueryResponse, setArticleQueryResponse] = useState("");
  const [currentPageId, setCurrentPageId] = useState(BigNumber.from(0));
  const [isSponsoring, setIsSponsoring] = useState(false);
  const [isSponsored, setIsSponsored] = useState(false);
  const [owner, setOwner] = useState("");

  const { account } = useEthers();
  const wikiTokenContract = useWikiTokenContract();
  const { send, state } = useContractFunction(wikiTokenContract, "mintWikipediaPage");

  const [formValue, setFormValue] = useState("");

  let cancelRequest;

  const refresh = () => {
    let currentPageId = BigNumber.from(
      articleQueryResponse && articleQueryResponse.pageId ? articleQueryResponse.pageId : 0,
    );
    setCurrentPageId(currentPageId);
    wikiTokenContract
      .isPageMinted(currentPageId)
      .then(res => setIsSponsored(res))
      .catch(err => {
        console.log(`Error checking if page is minted: `, err);
      });
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleQueryResponse, state]);

  useEffect(() => {
    setValidateStatus(VALIDATE_STATUS_VALIDATING);
    let id = setTimeout(() => {
      fetchArticleMetadata(formValue);
    }, DEBOUNCE_DELAY_MS);
    return () => {
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formValue]);

  const fetchArticleMetadata = article => {
    cancelRequest && cancelRequest();
    if (!article || article.length === 0) {
      setArticleQueryResponse(null);
      setValidateStatus(VALIDATE_STATUS_IDLE);
      return;
    }
    axios
      .get(`${process.env.REACT_APP_METADATA_API_BASE_URL}/api/article/${article}`, {
        cancelToken: new axios.CancelToken(function executor(canceler) {
          cancelRequest = canceler;
        }),
      })
      .then(response => {
        setArticleQueryResponse(response?.data);
        setValidateStatus(
          response.status === 200 ? VALIDATE_STATUS_SUCCESS : VALIDATE_STATUS_ERROR,
        );
      })
      .catch(error => {
        console.log("Error: ", error);
        setArticleQueryResponse(null);
        setValidateStatus(VALIDATE_STATUS_ERROR);
      });
  };

  const sponsor = async () => {
    try {
      setIsSponsoring(true);
      // TODO: we should show error message
      await send(currentPageId, {
        value: web3.utils.toBN(web3.utils.toWei("0.01", "ether")).toString(),
      });
      setIsSponsoring(false);
      setTimeout(() => {
        refresh();
      }, REFRESH_DELAY_MS);
    } catch (e) {
      console.log("Error sponsoring: ", e);
      setIsSponsored(false);
    }
  };

  const openOpenSea = () => {
    window.open(
      `https://opensea.io/assets/0xd224b0eaf5b5799ca46d9fdb89a2c10941e66109/${articleQueryResponse?.pageId}`,
    );
  };

  return (
    <div className="menu-view">
      <Form className="sponsor-input" size="large">
        <Form.Item hasFeedback validateStatus={validateStatus} size="large">
          <Input
            addonBefore="https://en.wikipedia.org/wiki/"
            placeholder="Earth"
            size="large"
            disabled={!account || isSponsoring}
            onChange={e => {
              setFormValue(e.target.value);
            }}
            value={formValue}
          />
        </Form.Item>
      </Form>
      {/* For whatever reason, style/visibility isn't working for alert so we have to wrap it */}
      <div hidden={account}>
        <Alert message="You must connect a wallet in order to sponsor tokens 😢" type="error" />
      </div>
      <div hidden={validateStatus !== VALIDATE_STATUS_SUCCESS}>
        {articleQueryResponse?.pageId && (
          <Token
            key={articleQueryResponse?.pageId}
            imageUrl={articleQueryResponse?.imageUrl}
            pageId={articleQueryResponse?.pageId}
            pageTitle={articleQueryResponse?.pageTitle}
            sponsorshipStatus={isSponsored}
            showOwner={isSponsored}
            onOwnerDetermined={owner => {
              setOwner(owner);
            }}
          />
        )}
        <div hidden={isSponsored || !account}>
          <Button
            loading={isSponsoring || (state && state.status === STATE_MINING)}
            onClick={sponsor}
          >
            Sponsor for {MINT_FEE}
          </Button>
        </div>
        <div hidden={!isSponsored}>
          <Button onClick={openOpenSea}>
            {account && owner && account === owner ? `List on Open Sea` : `Buy on Open Sea`}
          </Button>
        </div>
      </div>
    </div>
  );
}
