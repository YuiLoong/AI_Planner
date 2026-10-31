import { TripInfo } from "@/app/create-new-trip/_compoents/ChatBox";
import { createContext } from "react";

export type TripContextType = {
    tripDetailInfo:TripInfo | null,
    setTripDetailInfo:React.Dispatch<React.SetStateAction<TripInfo | null>>;
}

export const TripDetailContext=createContext<TripContextType | undefined>(undefined);