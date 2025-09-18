import Link from "next/link";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { isLocalNetwork } from "~~/utils/scaffold-eth";

type AddressLinkWrapperProps = {
  children: React.ReactNode;
  disableAddressLink?: boolean;
  blockExplorerAddressLink: string;
};

export const AddressLinkWrapper = ({
  children,
  disableAddressLink,
  blockExplorerAddressLink,
}: AddressLinkWrapperProps) => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalChain = isLocalNetwork(targetNetwork.id);

  return disableAddressLink ? (
    <>{children}</>
  ) : (
    <Link
      href={blockExplorerAddressLink}
      target={isLocalChain ? undefined : "_blank"}
      rel={isLocalChain ? undefined : "noopener noreferrer"}
    >
      {children}
    </Link>
  );
};
