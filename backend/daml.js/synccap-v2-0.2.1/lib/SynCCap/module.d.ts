// Generated from ../SynCCap/module.daml

/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as jtv from '@mojotech/json-type-validation';
import * as damlTypes from '@daml/types';

import * as pkg5aee9b21b8e9a4c4975b5f4c4198e6e6e8469df49e2010820e792f393db870f4 from '@daml.js/daml-prim-DA-Types-1.0.0';
import * as pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 from '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0';

export declare type AcceptTransfer = {
  agreedPricePerWafer: damlTypes.Numeric,
}

export declare const AcceptTransfer:
  damlTypes.Serializable<AcceptTransfer>

export declare type AcknowledgeRejection = {
  logCid: damlTypes.ContractId<RejectedTransferLog>,
}

export declare const AcknowledgeRejection:
  damlTypes.Serializable<AcknowledgeRejection>

export declare type AssetStatus =
  | 'Active'
  | 'Transferred'
  | 'Penalized'


export declare const AssetStatus:
  damlTypes.Serializable<AssetStatus> & { readonly keys: AssetStatus[] } & { readonly [e in AssetStatus]: e }

export declare type CapacityAsset = {
  manufacturer: damlTypes.Party,
  owner: damlTypes.Party,
  assetId: string,
  technologyNode: TechnologyNode,
  waferStartsPerMonth: damlTypes.Int,
  costBasisPerWafer: damlTypes.Numeric,
  commitmentStartDate: string,
  commitmentEndDate: string,
  status: AssetStatus,
}

export declare interface CapacityAssetInterface {
  Archive: 
    damlTypes.Choice<CapacityAsset, pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive, {}, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<CapacityAsset, undefined>>;
  InitiatePenalty: 
    damlTypes.Choice<CapacityAsset, InitiatePenalty, damlTypes.ContractId<PenaltyAgreement>, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<CapacityAsset, undefined>>;
  ProposeTransfer: 
    damlTypes.Choice<CapacityAsset, ProposeTransfer, pkg5aee9b21b8e9a4c4975b5f4c4198e6e6e8469df49e2010820e792f393db870f4.DA.Types.Tuple2<damlTypes.ContractId<TransferRFQ>, damlTypes.ContractId<CapacityAssetLock>>, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<CapacityAsset, undefined>>;
}
export declare const CapacityAsset:
  damlTypes.Template<CapacityAsset, undefined, '#synccap-v2:SynCCap:CapacityAsset'> &
  damlTypes.ToInterface<CapacityAsset, never> &
  CapacityAssetInterface

export declare type CapacityAssetLock = {
  manufacturer: damlTypes.Party,
  owner: damlTypes.Party,
  assetId: string,
  technologyNode: TechnologyNode,
  waferStartsPerMonth: damlTypes.Int,
  costBasisPerWafer: damlTypes.Numeric,
  commitmentStartDate: string,
  commitmentEndDate: string,
}

export declare interface CapacityAssetLockInterface {
  AcknowledgeRejection: 
    damlTypes.Choice<CapacityAssetLock, AcknowledgeRejection, damlTypes.ContractId<CapacityAsset>, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<CapacityAssetLock, undefined>>;
  Archive: 
    damlTypes.Choice<CapacityAssetLock, pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive, {}, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<CapacityAssetLock, undefined>>;
  CleanupLock: 
    damlTypes.Choice<CapacityAssetLock, CleanupLock, {}, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<CapacityAssetLock, undefined>>;
  WithdrawOffer: 
    damlTypes.Choice<CapacityAssetLock, WithdrawOffer, damlTypes.ContractId<CapacityAsset>, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<CapacityAssetLock, undefined>>;
}
export declare const CapacityAssetLock:
  damlTypes.Template<CapacityAssetLock, undefined, '#synccap-v2:SynCCap:CapacityAssetLock'> &
  damlTypes.ToInterface<CapacityAssetLock, never> &
  CapacityAssetLockInterface

export declare type CleanupLock = {
}

export declare const CleanupLock:
  damlTypes.Serializable<CleanupLock>

export declare type DisputePenalty = {
  proposedRate: damlTypes.Numeric,
  disputeReason: string,
}

export declare const DisputePenalty:
  damlTypes.Serializable<DisputePenalty>

export declare type InitiatePenalty = {
  penaltyRate: damlTypes.Numeric,
  cancellationReason: string,
}

export declare const InitiatePenalty:
  damlTypes.Serializable<InitiatePenalty>

export declare type MarkReclaimed = {
}

export declare const MarkReclaimed:
  damlTypes.Serializable<MarkReclaimed>

export declare type PenaltyAgreement = {
  manufacturer: damlTypes.Party,
  penalizedParty: damlTypes.Party,
  assetId: string,
  technologyNode: TechnologyNode,
  penaltyRate: damlTypes.Numeric,
  penaltyAmount: damlTypes.Numeric,
  cancellationReason: string,
  waferStartsPerMonth: damlTypes.Int,
  costBasisPerWafer: damlTypes.Numeric,
  isSettled: boolean,
}

export declare interface PenaltyAgreementInterface {
  Archive: 
    damlTypes.Choice<PenaltyAgreement, pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive, {}, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<PenaltyAgreement, undefined>>;
  DisputePenalty: 
    damlTypes.Choice<PenaltyAgreement, DisputePenalty, damlTypes.ContractId<PenaltyAgreement>, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<PenaltyAgreement, undefined>>;
  SettlePenalty: 
    damlTypes.Choice<PenaltyAgreement, SettlePenalty, damlTypes.ContractId<PenaltyAgreement>, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<PenaltyAgreement, undefined>>;
}
export declare const PenaltyAgreement:
  damlTypes.Template<PenaltyAgreement, undefined, '#synccap-v2:SynCCap:PenaltyAgreement'> &
  damlTypes.ToInterface<PenaltyAgreement, never> &
  PenaltyAgreementInterface

export declare type ProposeTransfer = {
  secondaryBuyer: damlTypes.Party,
  askingPricePerWafer: damlTypes.Numeric,
}

export declare const ProposeTransfer:
  damlTypes.Serializable<ProposeTransfer>

export declare type RejectTransfer = {
}

export declare const RejectTransfer:
  damlTypes.Serializable<RejectTransfer>

export declare type RejectedTransferLog = {
  manufacturer: damlTypes.Party,
  seller: damlTypes.Party,
  buyer: damlTypes.Party,
  assetId: string,
  askingPricePerWafer: damlTypes.Numeric,
  isReclaimed: boolean,
}

export declare interface RejectedTransferLogInterface {
  Archive: 
    damlTypes.Choice<RejectedTransferLog, pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive, {}, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<RejectedTransferLog, undefined>>;
  MarkReclaimed: 
    damlTypes.Choice<RejectedTransferLog, MarkReclaimed, damlTypes.ContractId<RejectedTransferLog>, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<RejectedTransferLog, undefined>>;
}
export declare const RejectedTransferLog:
  damlTypes.Template<RejectedTransferLog, undefined, '#synccap-v2:SynCCap:RejectedTransferLog'> &
  damlTypes.ToInterface<RejectedTransferLog, never> &
  RejectedTransferLogInterface

export declare type SettlePenalty = {
}

export declare const SettlePenalty:
  damlTypes.Serializable<SettlePenalty>

export declare type TechnologyNode =
  | 'N3nm'
  | 'N5nm'
  | 'N7nm'
  | 'N14nm'


export declare const TechnologyNode:
  damlTypes.Serializable<TechnologyNode> & { readonly keys: TechnologyNode[] } & { readonly [e in TechnologyNode]: e }

export declare type TransferRFQ = {
  manufacturer: damlTypes.Party,
  seller: damlTypes.Party,
  buyer: damlTypes.Party,
  assetId: string,
  technologyNode: TechnologyNode,
  waferStartsPerMonth: damlTypes.Int,
  askingPricePerWafer: damlTypes.Numeric,
  commitmentStartDate: string,
  commitmentEndDate: string,
}

export declare interface TransferRFQInterface {
  AcceptTransfer: 
    damlTypes.Choice<TransferRFQ, AcceptTransfer, damlTypes.ContractId<CapacityAsset>, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<TransferRFQ, undefined>>;
  Archive: 
    damlTypes.Choice<TransferRFQ, pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive, {}, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<TransferRFQ, undefined>>;
  RejectTransfer: 
    damlTypes.Choice<TransferRFQ, RejectTransfer, damlTypes.ContractId<RejectedTransferLog>, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<TransferRFQ, undefined>>;
}
export declare const TransferRFQ:
  damlTypes.Template<TransferRFQ, undefined, '#synccap-v2:SynCCap:TransferRFQ'> &
  damlTypes.ToInterface<TransferRFQ, never> &
  TransferRFQInterface

export declare type WithdrawOffer = {
  rfqCid: damlTypes.ContractId<TransferRFQ>,
}

export declare const WithdrawOffer:
  damlTypes.Serializable<WithdrawOffer>

export declare type WithdrawnTransferLog = {
  manufacturer: damlTypes.Party,
  seller: damlTypes.Party,
  buyer: damlTypes.Party,
  assetId: string,
}

export declare interface WithdrawnTransferLogInterface {
  Archive: 
    damlTypes.Choice<WithdrawnTransferLog, pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive, {}, undefined> &
    damlTypes.ChoiceFrom<damlTypes.Template<WithdrawnTransferLog, undefined>>;
}
export declare const WithdrawnTransferLog:
  damlTypes.Template<WithdrawnTransferLog, undefined, '#synccap-v2:SynCCap:WithdrawnTransferLog'> &
  damlTypes.ToInterface<WithdrawnTransferLog, never> &
  WithdrawnTransferLogInterface
