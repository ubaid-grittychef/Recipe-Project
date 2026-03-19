import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Preview,
} from "@react-email/components";

interface Props {
  firstName: string;
  used: number;
  quota: number;
  billingUrl: string;
}

export function QuotaWarningEmail({ firstName, used, quota, billingUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>
        You have used {used} of {quota} recipes this month
      </Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "sans-serif" }}>
        <Container
          style={{
            maxWidth: 560,
            margin: "40px auto",
            background: "#fff",
            borderRadius: 12,
            padding: 32,
          }}
        >
          <Heading style={{ color: "#0f172a", fontSize: 22, fontWeight: 700 }}>
            You are at 80% of your monthly quota
          </Heading>
          <Text style={{ color: "#475569", fontSize: 15 }}>
            Hi {firstName}, you have generated {used} of {quota} recipes this month.
            Your quota resets on the 1st.
          </Text>
          <Text style={{ color: "#475569", fontSize: 15 }}>
            Once you hit {quota}, generation will pause until next month.
          </Text>
          <Button
            href={billingUrl}
            style={{
              background: "#f97316",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: 8,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-block",
              marginTop: 8,
            }}
          >
            View Billing
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
