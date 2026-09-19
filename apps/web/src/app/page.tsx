import {
  Challengeability,
  FinalCta,
  Hero,
  HowItWorks,
  Integrity,
  ModuleEcosystem,
  Problem,
  ProtocolFlow,
  WhyGenLayer,
} from "@/components/home/sections";
import { LiveProtocolStats } from "@/components/home/LiveProtocolStats";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ProtocolFlow />
      <Problem />
      <HowItWorks />
      <WhyGenLayer />
      <Integrity />
      <Challengeability />
      <ModuleEcosystem />
      <LiveProtocolStats />
      <FinalCta />
    </>
  );
}
