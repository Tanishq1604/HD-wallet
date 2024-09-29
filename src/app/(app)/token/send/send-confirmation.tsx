import React, { useState, useEffect } from "react";
import { Platform } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { useLocalSearchParams, router, useNavigation } from "expo-router";
import { StackActions } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Chains } from "../../../../types";
import type { ThemeType } from "../../../../styles/theme";
import ConfirmSend from "../../../../assets/svg/confirm-send.svg";
import { formatDollar } from "../../../../utils/formatDollars";
import { TICKERS } from "../../../../constants/tickers";
import { truncateWalletAddress } from "../../../../utils/truncateWalletAddress";
import SendConfCard from "../../../../components/SendConfCard/SendConfCard";
import { capitalizeFirstLetter } from "../../../../utils/capitalizeFirstLetter";
import Button from "../../../../components/Button/Button";
import ethService from "../../../../services/EthereumService";
import solanaService from "../../../../services/SolanaService";
import neoService from "../../../../services/NeoService";
import { getPhrase } from "../../../../hooks/useStorageState";
import type { RootState, AppDispatch } from "../../../../store";
import { sendEthereumTransaction } from "../../../../store/ethereumSlice";
import { sendSolanaTransaction } from "../../../../store/solanaSlice";
import { sendNeoTransaction } from "../../../../store/neoSlice";
import { BalanceContainer } from "../../../../components/Styles/Layout.styles";
import { SafeAreaContainer } from "../../../../components/Styles/Layout.styles";
import { ROUTES } from "../../../../constants/routes";

const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: flex-start;
  padding: ${(props) => props.theme.spacing.medium};
  margin-top: ${(props) =>
    Platform.OS === "android" && props.theme.spacing.huge};
`;

const IconBackground = styled.View<{ theme: ThemeType }>`
  background-color: ${(props) => props.theme.colors.ethereum};
  border-radius: 100px;
  padding: ${(props) => props.theme.spacing.large};
`;

const IconView = styled.View<{ theme: ThemeType }>`
  justify-content: center;
  align-items: center;
  margin-bottom: ${(props) => props.theme.spacing.medium};
  width: 100%;
`;

const CryptoBalanceText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.huge};
  color: ${(props) => props.theme.fonts.colors.primary};
  text-align: center;
`;

const UsdBalanceText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.title};
  color: ${(props) => props.theme.colors.lightGrey};
  text-align: center;
`;

const CryptoInfoCardContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: ${(props) => props.theme.spacing.medium};
`;

const ButtonContainer = styled.View<{ theme: ThemeType }>`
  margin-bottom: ${(props) => props.theme.spacing.small};
`;

const ErrorView = styled.View<{ theme: ThemeType }>`
  margin-top: ${(props) => props.theme.spacing.medium};
`;

const ErrorText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.error};
  text-align: center;
`;

const ButtonView = styled.View<{ theme: ThemeType }>``;

export default function SendConfirmationPage() {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const {
    address: toAddress,
    amount: tokenAmount,
    chainName: chain,
  } = useLocalSearchParams();
  const navigation = useNavigation();

  const chainName = chain as string;
  const ticker = TICKERS[chainName];
  const amount = tokenAmount as string;
  const address = toAddress as string;

  const prices = useSelector((state: RootState) => state.price.data);
  const activeEthIndex = useSelector(
    (state: RootState) => state.ethereum.activeIndex
  );
  const activeSolIndex = useSelector(
    (state: RootState) => state.solana.activeIndex
  );
  const activeNeoIndex = useSelector(
    (state: RootState) => state.neo.activeIndex
  );
  const walletAddress = useSelector(
    (state: RootState) => state[chainName].addresses[activeEthIndex].address
  );
  const derivationPath = useSelector(
    (state: RootState) =>
      state[chainName].addresses[activeSolIndex].derivationPath
  );

  const solPrice = prices.solana.usd;
  const ethPrice = prices.ethereum.usd;
  const neoPrice = prices.neo.usd;

  const [transactionFeeEstimate, setTransactionFeeEstimate] = useState("0.00");
  const [totalCost, setTotalCost] = useState("0.00");
  const [error, setError] = useState<string | null>(null);
  const [isBtnDisabled, setBtnDisabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const chainBalance = `${amount} ${ticker}`;

  const handleSubmit = async () => {
    const seedPhrase = await getPhrase();

    setLoading(true);
    setBtnDisabled(true);

    try {
      if (chainName === Chains.Ethereum) {
        const ethPrivateKey = await ethService.derivePrivateKeysFromPhrase(
          seedPhrase,
          derivationPath
        );

        const result = await dispatch(
          sendEthereumTransaction({
            address,
            privateKey: ethPrivateKey,
            amount,
          })
        ).unwrap();
        if (result) {
          navigation.dispatch(StackActions.popToTop());
          router.push({
            pathname: ROUTES.confirmation,
            params: { txHash: result.hash, blockchain: Chains.Ethereum },
          });
        }
      } else if (chainName === Chains.Solana) {
        const solPrivateKey = await solanaService.derivePrivateKeysFromPhrase(
          seedPhrase,
          derivationPath
        );
        const result = await dispatch(
          sendSolanaTransaction({
            privateKey: solPrivateKey,
            address,
            amount,
          })
        ).unwrap();

        if (result) {
          navigation.dispatch(StackActions.popToTop());
          router.push({
            pathname: ROUTES.confirmation,
            params: { txHash: result, blockchain: Chains.Solana },
          });
        }
      }else if (chainName === Chains.Neo) {
        const neoPrivateKey = await neoService.derivePrivateKeysFromPhrase(
          seedPhrase,
          derivationPath
        );
        const result = await dispatch(
          sendNeoTransaction({
            privateKey: neoPrivateKey,
            toAddress: address,  // Change 'address' to 'toAddress'
            amount,
            assetId: '0xd2a4cff31913016155e38e474a2c06d08be276cf', // Replace with actual NEO or GAS asset ID
          })
        ).unwrap();
  
        if (result) {
          navigation.dispatch(StackActions.popToTop());
          router.push({
            pathname: ROUTES.confirmation,
            params: { txHash: result.txid, blockchain: Chains.Neo },
          });
        }
      }
    } catch (error) {
      console.error("Failed to send transaction:", error);
      setError("Failed to send transaction. Please try again later.");
    } finally {
      setLoading(false);
      setBtnDisabled(false);
    }
  };

  const calculateTransactionCosts = async () => {
    const chainPrice = chainName === Chains.Ethereum ? ethPrice : solPrice;
    try {
      if (chainName === Chains.Ethereum) {
        const { gasEstimate, totalCost, totalCostMinusGas } =
          await ethService.calculateGasAndAmounts(address, amount);

        const gasEstimateUsd = formatDollar(
          parseFloat(gasEstimate) * chainPrice
        );

        const totalCostPlusGasUsd = formatDollar(
          parseFloat(totalCost) * chainPrice
        );

        setTransactionFeeEstimate(gasEstimateUsd);
        setTotalCost(totalCostPlusGasUsd);

        if (totalCostMinusGas > amount) {
          setError("Not enough funds to send transaction.");
          setBtnDisabled(true);
        } else {
          setError("");
          setBtnDisabled(false);
        }
      }

      if (chainName === Chains.Solana) {
        const transactionFeeLamports =
          await solanaService.calculateTransactionFee(
            walletAddress,
            address,
            parseFloat(amount)
          );

        const tokenBalanceLamports = parseFloat(amount) * LAMPORTS_PER_SOL;
        const maxAmountLamports = tokenBalanceLamports - transactionFeeLamports;
        const transactionFeeSol = transactionFeeLamports / LAMPORTS_PER_SOL;
        const maxAmount = maxAmountLamports / LAMPORTS_PER_SOL;

        const txFeeFloat = transactionFeeSol * chainPrice;
        const txFeeEstimateUsd = formatDollar(txFeeFloat);
        const totalCostPlusTxFeeUsd = formatDollar(maxAmount * chainPrice);

        if (txFeeFloat > 0 && txFeeFloat < 0.01) {
          setTransactionFeeEstimate(`< ${txFeeEstimateUsd}`);
        } else {
          setTransactionFeeEstimate(txFeeEstimateUsd);
        }

        setTotalCost(totalCostPlusTxFeeUsd);

        if (maxAmount > parseFloat(amount)) {
          setError("Not enough funds to send transaction.");
          setBtnDisabled(true);
        } else {
          setError("");
          setBtnDisabled(false);
        }
      }else if (chainName === Chains.Neo) {
        const networkFee = await neoService.calculateNetworkFee(address, amount);
        const assetId = 'neo-asset-id'; // Replace with actual NEO or GAS asset ID
        const balance = await neoService.getBalance(walletAddress);
        const assetBalance = balance[assetId] || "0";
  
        // Convert network fee from satoshis to NEO
        const networkFeeNeo = parseFloat(networkFee) / 100000000;
        
        const networkFeeUsd = networkFeeNeo * chainPrice;
        const networkFeeEstimateUsd = formatDollar(networkFeeUsd);
  
        const amountNeo = parseFloat(amount);
        const totalCostNeo = amountNeo + networkFeeNeo;
        const totalCostUsd = formatDollar(totalCostNeo * chainPrice);
  
        if (networkFeeUsd > 0 && networkFeeUsd < 0.01) {
          setTransactionFeeEstimate(`< ${networkFeeEstimateUsd}`);
        } else {
          setTransactionFeeEstimate(networkFeeEstimateUsd);
        }
  
        setTotalCost(totalCostUsd);
        const availableBalance = parseFloat(assetBalance) / 100000000; // Convert from satoshis to NEO
      if (totalCostNeo > availableBalance) {
        setError("Not enough funds to send transaction.");
        setBtnDisabled(true);
      } else {
        setError("");
        setBtnDisabled(false);
      }
    }
    } catch (error) {
      console.error("Failed to fetch transaction costs:", error);
    }
  };

  useEffect(() => {
    calculateTransactionCosts();

    const intervalId = setInterval(async () => {
      await calculateTransactionCosts();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [address, amount]);

  const renderNetworkName = () => {
    const isDev = process.env.EXPO_PUBLIC_ENVIRONMENT === "development";
    if (chainName === Chains.Ethereum) {
      return isDev ? "Sepolia" : "Mainnet";
    }
    return isDev ? "Devnet" : "Mainnet";
  };

  return (
    <SafeAreaContainer>
      <ContentContainer>
        <IconView>
          <IconBackground>
            <ConfirmSend width={45} height={45} fill={theme.colors.primary} />
          </IconBackground>
        </IconView>
        <BalanceContainer>
          <CryptoBalanceText>{chainBalance}</CryptoBalanceText>
          <UsdBalanceText>{totalCost}</UsdBalanceText>
        </BalanceContainer>
        <CryptoInfoCardContainer>
          <SendConfCard
            toAddress={truncateWalletAddress(address)}
            network={`${capitalizeFirstLetter(
              chainName
            )} ${renderNetworkName()}`}
            networkFee={`Up to ${transactionFeeEstimate}`}
          />
          {error && (
            <ErrorView>
              <ErrorText>{error}</ErrorText>
            </ErrorView>
          )}
        </CryptoInfoCardContainer>
        <ButtonView>
          <ButtonContainer>
            <Button
              linearGradient={theme.colors.primaryLinearGradient}
              loading={loading}
              disabled={isBtnDisabled}
              backgroundColor={theme.colors.primary}
              onPress={handleSubmit}
              title="Send"
            />
          </ButtonContainer>
        </ButtonView>
      </ContentContainer>
    </SafeAreaContainer>
  );
}
