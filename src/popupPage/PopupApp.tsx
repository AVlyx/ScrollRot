import { OpenSettingsButton } from "@/components";
import DebugStorage from "@/components/DebugStorage";
import { FocusTimerWidget } from "@/components/FocusTimer";

const PopupApp: React.FC = () => {
  return (
    <>
      <DebugStorage />
      <FocusTimerWidget />
      <OpenSettingsButton />
    </>
  );
};

export default PopupApp;
