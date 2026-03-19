import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Preview,
} from "@react-email/components";

interface Props {
  firstName: string;
  loginUrl: string;
}

export function WelcomeEmail({ firstName, loginUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Recipe Factory — your first recipe site awaits</Preview>
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
          <Heading style={{ color: "#0f172a", fontSize: 24, fontWeight: 700 }}>
            Welcome to Recipe Factory
          </Heading>
          <Text style={{ color: "#475569", fontSize: 15, lineHeight: "24px" }}>
            Hi {firstName}, your account is active and ready to go.
          </Text>
          <Text style={{ color: "#475569", fontSize: 15, lineHeight: "24px" }}>
            Here&apos;s how to launch your first recipe site in 10 minutes:
          </Text>
          <ol style={{ color: "#475569", fontSize: 15, lineHeight: "28px" }}>
            <li>Create a project and choose your niche</li>
            <li>Add keywords via the built-in queue or a Google Sheet</li>
            <li>Hit Generate — AI writes and illustrates every recipe</li>
            <li>Publish drafts and deploy your site to Vercel</li>
          </ol>
          <Button
            href={loginUrl}
            style={{
              background: "#f97316",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: 8,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-block",
              marginTop: 16,
            }}
          >
            Open Recipe Factory
          </Button>
          <Hr style={{ margin: "32px 0", borderColor: "#e2e8f0" }} />
          <Text style={{ color: "#94a3b8", fontSize: 12 }}>
            Questions? Reply to this email — we read every one.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
