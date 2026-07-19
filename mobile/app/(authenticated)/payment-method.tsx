import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import PaymentMethodScreen from "../../src/features/wallet/screens/PaymentMethodScreen";

export default function PaymentMethodRoute() {
  const { packId, amount, currency } = useLocalSearchParams<{ packId: string; amount: string; currency?: string }>();
  return (
    <View style={{ flex: 1 }}>
      <PaymentMethodScreen
        packId={packId || "custom_100"}
        amount={Number(amount || 100)}
        currency={currency || "NGN"}
      />
    </View>
  );
}
