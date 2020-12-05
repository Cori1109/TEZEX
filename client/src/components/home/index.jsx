import React from "react";
import { useHistory } from "react-router-dom";
import refundEth from "../../library/ethereum/operations/refund";
import refundTez from "../../library/tezos/operations/refund";
import useStyles from "./style";

const Home = ({ swaps, ethStore, tezStore, update }) => {
  const history = useHistory();
  const classes = useStyles();

  const refundHandler = async (hashedSecret)=>{
    let res = false;
    if(swaps[hashedSecret].type==="eth")
    res = await refundEth(ethStore.web3, ethStore, hashedSecret);
    else
    res = await refundTez(tezStore, hashedSecret);
    if(!res) alert("error in refunding, check if the refund time has come")
    else
    update(hashedSecret, 4)
  }
  const SwapItem = (data) => {
    const exp = new Date(data.refundTime * 1000);
    const state = {
      0: "Error in Swap",
      1: "Swap Initiated",
      2: "Swap Response Found",
      3: "Completed",
      4: "Refunded",
    };
    return (
      <div className={classes.swap} key={data.hashedSecret}>
        <p>Hash : {data.hashedSecret}</p>
        <p>Value : {data.value}</p>
        <p>Expiry Time : {exp.toLocaleString()}</p>
        {data.state===0 &&
        <div className={classes.error}>
          <p>{state[data.state]}</p>
          <button className={classes.errorBtn} onClick={()=>refundHandler(data.hashedSecret)}>refund!</button>
        </div>}
        {data.state!==0 &&
        <p>State : {state[data.state]}</p>}
      </div>
    );
  };
  let data = (
    <div className={classes.noSwap}>
      <p>
        No Swaps Created Yet! Learn more about <b>TrueSwap</b> and how to create
        your own Atomic Swap
      </p>
      <button className={classes.button} onClick={() => history.push("/about")}>
        Learn More
      </button>
      <p>or create a Swap now!</p>
      <button
        className={classes.button}
        onClick={() => history.push("/create")}
      >
        Start New Swap
      </button>
    </div>
  );
  if (swaps !== undefined)
    data = Object.keys(swaps).map((key) => SwapItem(swaps[key]));
  return (
    <div>
      <div className={classes.swaps}>
        <h3>Your Swaps</h3>
        {data}
      </div>
    </div>
  );
};

export default Home;
