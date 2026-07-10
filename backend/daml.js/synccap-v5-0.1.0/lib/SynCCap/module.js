"use strict";
/* eslint-disable-next-line no-unused-vars */
function __export(m) {
/* eslint-disable-next-line no-prototype-builtins */
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });

/* eslint-disable-next-line no-unused-vars */
var jtv = require('@mojotech/json-type-validation');
/* eslint-disable-next-line no-unused-vars */
var damlTypes = require('@daml/types');

var pkg5aee9b21b8e9a4c4975b5f4c4198e6e6e8469df49e2010820e792f393db870f4 = require('@daml.js/daml-prim-DA-Types-1.0.0');
var pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 = require('@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0');

exports.AcceptTransfer = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
      agreedPricePerWafer: damlTypes.Numeric(10).decoder,
    });
  }),
  encode: function (__typed__) {
    return {
      agreedPricePerWafer: damlTypes.Numeric(10).encode(__typed__.agreedPricePerWafer),
    };
  },
};

exports.AcknowledgeRejectionLock = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
    });
  }),
  encode: function (__typed__) {
    return {};
  },
};

exports.AssetStatus = {
  Active: 'Active',
  Transferred: 'Transferred',
  Penalized: 'Penalized',
  keys: ['Active', 'Transferred', 'Penalized'],
  decoder: damlTypes.lazyMemo(function () {
    return jtv.oneOf(
      jtv.constant(exports.AssetStatus.Active),
      jtv.constant(exports.AssetStatus.Transferred),
      jtv.constant(exports.AssetStatus.Penalized),
    );
  }),
  encode: function (__typed__) { return __typed__; },
};

exports.CapacityAsset = damlTypes.assembleTemplate(
  {
    templateId: '#synccap-v5:SynCCap:CapacityAsset',
    templateIdWithPackageId: '#09630ea91293d781ab05547c5ae9ced52c122ffaf7f239f1fabc9f8541a28cdc:SynCCap:CapacityAsset',
    keyDecoder: jtv.constant(undefined),
    keyEncode: function () { throw 'EncodeError'; },
    decoder: damlTypes.lazyMemo(function () {
      return jtv.object({
        manufacturer: damlTypes.Party.decoder,
        owner: damlTypes.Party.decoder,
        assetId: damlTypes.Text.decoder,
        technologyNode: exports.TechnologyNode.decoder,
        waferStartsPerMonth: damlTypes.Int.decoder,
        commitmentStartDate: damlTypes.Text.decoder,
        commitmentEndDate: damlTypes.Text.decoder,
        status: exports.AssetStatus.decoder,
        timestamp: damlTypes.Time.decoder,
      });
    }),
    encode: function (__typed__) {
      return {
        manufacturer: damlTypes.Party.encode(__typed__.manufacturer),
        owner: damlTypes.Party.encode(__typed__.owner),
        assetId: damlTypes.Text.encode(__typed__.assetId),
        technologyNode: exports.TechnologyNode.encode(__typed__.technologyNode),
        waferStartsPerMonth: damlTypes.Int.encode(__typed__.waferStartsPerMonth),
        commitmentStartDate: damlTypes.Text.encode(__typed__.commitmentStartDate),
        commitmentEndDate: damlTypes.Text.encode(__typed__.commitmentEndDate),
        status: exports.AssetStatus.encode(__typed__.status),
        timestamp: damlTypes.Time.encode(__typed__.timestamp),
      };
    },
    Archive: {
      template: function () { return exports.CapacityAsset; },
      choiceName: 'Archive',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.decoder;
      }),
      argumentEncode: function (__typed__) { return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.Unit.decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
    },
    LockForTransfer: {
      template: function () { return exports.CapacityAsset; },
      choiceName: 'LockForTransfer',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return exports.LockForTransfer.decoder;
      }),
      argumentEncode: function (__typed__) { return exports.LockForTransfer.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.ContractId(exports.CapacityAssetLock).decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.ContractId(exports.CapacityAssetLock).encode(__typed__); },
    },
  },
);

damlTypes.registerTemplate(exports.CapacityAsset, ['09630ea91293d781ab05547c5ae9ced52c122ffaf7f239f1fabc9f8541a28cdc', '#synccap-v5']);

exports.CapacityAssetLock = damlTypes.assembleTemplate(
  {
    templateId: '#synccap-v5:SynCCap:CapacityAssetLock',
    templateIdWithPackageId: '#09630ea91293d781ab05547c5ae9ced52c122ffaf7f239f1fabc9f8541a28cdc:SynCCap:CapacityAssetLock',
    keyDecoder: jtv.constant(undefined),
    keyEncode: function () { throw 'EncodeError'; },
    decoder: damlTypes.lazyMemo(function () {
      return jtv.object({
        manufacturer: damlTypes.Party.decoder,
        owner: damlTypes.Party.decoder,
        assetId: damlTypes.Text.decoder,
        technologyNode: exports.TechnologyNode.decoder,
        waferStartsPerMonth: damlTypes.Int.decoder,
        buyer: damlTypes.Party.decoder,
        commitmentStartDate: damlTypes.Text.decoder,
        commitmentEndDate: damlTypes.Text.decoder,
        timestamp: damlTypes.Time.decoder,
      });
    }),
    encode: function (__typed__) {
      return {
        manufacturer: damlTypes.Party.encode(__typed__.manufacturer),
        owner: damlTypes.Party.encode(__typed__.owner),
        assetId: damlTypes.Text.encode(__typed__.assetId),
        technologyNode: exports.TechnologyNode.encode(__typed__.technologyNode),
        waferStartsPerMonth: damlTypes.Int.encode(__typed__.waferStartsPerMonth),
        buyer: damlTypes.Party.encode(__typed__.buyer),
        commitmentStartDate: damlTypes.Text.encode(__typed__.commitmentStartDate),
        commitmentEndDate: damlTypes.Text.encode(__typed__.commitmentEndDate),
        timestamp: damlTypes.Time.encode(__typed__.timestamp),
      };
    },
    AcknowledgeRejectionLock: {
      template: function () { return exports.CapacityAssetLock; },
      choiceName: 'AcknowledgeRejectionLock',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return exports.AcknowledgeRejectionLock.decoder;
      }),
      argumentEncode: function (__typed__) { return exports.AcknowledgeRejectionLock.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.ContractId(exports.CapacityAsset).decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.ContractId(exports.CapacityAsset).encode(__typed__); },
    },
    Archive: {
      template: function () { return exports.CapacityAssetLock; },
      choiceName: 'Archive',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.decoder;
      }),
      argumentEncode: function (__typed__) { return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.Unit.decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
    },
    FinalizeTransfer: {
      template: function () { return exports.CapacityAssetLock; },
      choiceName: 'FinalizeTransfer',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return exports.FinalizeTransfer.decoder;
      }),
      argumentEncode: function (__typed__) { return exports.FinalizeTransfer.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.ContractId(exports.CapacityAsset).decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.ContractId(exports.CapacityAsset).encode(__typed__); },
    },
    WithdrawLock: {
      template: function () { return exports.CapacityAssetLock; },
      choiceName: 'WithdrawLock',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return exports.WithdrawLock.decoder;
      }),
      argumentEncode: function (__typed__) { return exports.WithdrawLock.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.ContractId(exports.CapacityAsset).decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.ContractId(exports.CapacityAsset).encode(__typed__); },
    },
  },
);

damlTypes.registerTemplate(exports.CapacityAssetLock, ['09630ea91293d781ab05547c5ae9ced52c122ffaf7f239f1fabc9f8541a28cdc', '#synccap-v5']);

exports.CapacityFinancials = damlTypes.assembleTemplate(
  {
    templateId: '#synccap-v5:SynCCap:CapacityFinancials',
    templateIdWithPackageId: '#09630ea91293d781ab05547c5ae9ced52c122ffaf7f239f1fabc9f8541a28cdc:SynCCap:CapacityFinancials',
    keyDecoder: jtv.constant(undefined),
    keyEncode: function () { throw 'EncodeError'; },
    decoder: damlTypes.lazyMemo(function () {
      return jtv.object({
        creditor: damlTypes.Party.decoder,
        debtor: damlTypes.Party.decoder,
        assetId: damlTypes.Text.decoder,
        technologyNode: exports.TechnologyNode.decoder,
        waferStartsPerMonth: damlTypes.Int.decoder,
        costBasisPerWafer: damlTypes.Numeric(10).decoder,
        timestamp: damlTypes.Time.decoder,
      });
    }),
    encode: function (__typed__) {
      return {
        creditor: damlTypes.Party.encode(__typed__.creditor),
        debtor: damlTypes.Party.encode(__typed__.debtor),
        assetId: damlTypes.Text.encode(__typed__.assetId),
        technologyNode: exports.TechnologyNode.encode(__typed__.technologyNode),
        waferStartsPerMonth: damlTypes.Int.encode(__typed__.waferStartsPerMonth),
        costBasisPerWafer: damlTypes.Numeric(10).encode(__typed__.costBasisPerWafer),
        timestamp: damlTypes.Time.encode(__typed__.timestamp),
      };
    },
    Archive: {
      template: function () { return exports.CapacityFinancials; },
      choiceName: 'Archive',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.decoder;
      }),
      argumentEncode: function (__typed__) { return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.Unit.decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
    },
    InitiatePenalty: {
      template: function () { return exports.CapacityFinancials; },
      choiceName: 'InitiatePenalty',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return exports.InitiatePenalty.decoder;
      }),
      argumentEncode: function (__typed__) { return exports.InitiatePenalty.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.ContractId(exports.PenaltyAgreement).decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.ContractId(exports.PenaltyAgreement).encode(__typed__); },
    },
  },
);

damlTypes.registerTemplate(exports.CapacityFinancials, ['09630ea91293d781ab05547c5ae9ced52c122ffaf7f239f1fabc9f8541a28cdc', '#synccap-v5']);

exports.DisputePenalty = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
      proposedRate: damlTypes.Numeric(10).decoder,
      disputeReason: damlTypes.Text.decoder,
    });
  }),
  encode: function (__typed__) {
    return {
      proposedRate: damlTypes.Numeric(10).encode(__typed__.proposedRate),
      disputeReason: damlTypes.Text.encode(__typed__.disputeReason),
    };
  },
};

exports.FinalizeTransfer = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
      newOwner: damlTypes.Party.decoder,
    });
  }),
  encode: function (__typed__) {
    return {
      newOwner: damlTypes.Party.encode(__typed__.newOwner),
    };
  },
};

exports.InitiatePenalty = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
      assetCid: damlTypes.ContractId(exports.CapacityAsset).decoder,
      penaltyRate: damlTypes.Numeric(10).decoder,
      cancellationReason: damlTypes.Text.decoder,
    });
  }),
  encode: function (__typed__) {
    return {
      assetCid: damlTypes.ContractId(exports.CapacityAsset).encode(__typed__.assetCid),
      penaltyRate: damlTypes.Numeric(10).encode(__typed__.penaltyRate),
      cancellationReason: damlTypes.Text.encode(__typed__.cancellationReason),
    };
  },
};

exports.LockForTransfer = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
      secondaryBuyer: damlTypes.Party.decoder,
    });
  }),
  encode: function (__typed__) {
    return {
      secondaryBuyer: damlTypes.Party.encode(__typed__.secondaryBuyer),
    };
  },
};

exports.MarkReclaimed = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
    });
  }),
  encode: function (__typed__) {
    return {};
  },
};

exports.PenaltyAgreement = damlTypes.assembleTemplate(
  {
    templateId: '#synccap-v5:SynCCap:PenaltyAgreement',
    templateIdWithPackageId: '#09630ea91293d781ab05547c5ae9ced52c122ffaf7f239f1fabc9f8541a28cdc:SynCCap:PenaltyAgreement',
    keyDecoder: jtv.constant(undefined),
    keyEncode: function () { throw 'EncodeError'; },
    decoder: damlTypes.lazyMemo(function () {
      return jtv.object({
        manufacturer: damlTypes.Party.decoder,
        penalizedParty: damlTypes.Party.decoder,
        assetId: damlTypes.Text.decoder,
        technologyNode: exports.TechnologyNode.decoder,
        penaltyRate: damlTypes.Numeric(10).decoder,
        penaltyAmount: damlTypes.Numeric(10).decoder,
        cancellationReason: damlTypes.Text.decoder,
        waferStartsPerMonth: damlTypes.Int.decoder,
        costBasisPerWafer: damlTypes.Numeric(10).decoder,
        isSettled: damlTypes.Bool.decoder,
        timestamp: damlTypes.Time.decoder,
      });
    }),
    encode: function (__typed__) {
      return {
        manufacturer: damlTypes.Party.encode(__typed__.manufacturer),
        penalizedParty: damlTypes.Party.encode(__typed__.penalizedParty),
        assetId: damlTypes.Text.encode(__typed__.assetId),
        technologyNode: exports.TechnologyNode.encode(__typed__.technologyNode),
        penaltyRate: damlTypes.Numeric(10).encode(__typed__.penaltyRate),
        penaltyAmount: damlTypes.Numeric(10).encode(__typed__.penaltyAmount),
        cancellationReason: damlTypes.Text.encode(__typed__.cancellationReason),
        waferStartsPerMonth: damlTypes.Int.encode(__typed__.waferStartsPerMonth),
        costBasisPerWafer: damlTypes.Numeric(10).encode(__typed__.costBasisPerWafer),
        isSettled: damlTypes.Bool.encode(__typed__.isSettled),
        timestamp: damlTypes.Time.encode(__typed__.timestamp),
      };
    },
    Archive: {
      template: function () { return exports.PenaltyAgreement; },
      choiceName: 'Archive',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.decoder;
      }),
      argumentEncode: function (__typed__) { return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.Unit.decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
    },
    DisputePenalty: {
      template: function () { return exports.PenaltyAgreement; },
      choiceName: 'DisputePenalty',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return exports.DisputePenalty.decoder;
      }),
      argumentEncode: function (__typed__) { return exports.DisputePenalty.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.ContractId(exports.PenaltyAgreement).decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.ContractId(exports.PenaltyAgreement).encode(__typed__); },
    },
    SettlePenalty: {
      template: function () { return exports.PenaltyAgreement; },
      choiceName: 'SettlePenalty',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return exports.SettlePenalty.decoder;
      }),
      argumentEncode: function (__typed__) { return exports.SettlePenalty.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.ContractId(exports.PenaltyAgreement).decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.ContractId(exports.PenaltyAgreement).encode(__typed__); },
    },
  },
);

damlTypes.registerTemplate(exports.PenaltyAgreement, ['09630ea91293d781ab05547c5ae9ced52c122ffaf7f239f1fabc9f8541a28cdc', '#synccap-v5']);

exports.RejectTransfer = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
    });
  }),
  encode: function (__typed__) {
    return {};
  },
};

exports.RejectedTransferLog = damlTypes.assembleTemplate(
  {
    templateId: '#synccap-v5:SynCCap:RejectedTransferLog',
    templateIdWithPackageId: '#09630ea91293d781ab05547c5ae9ced52c122ffaf7f239f1fabc9f8541a28cdc:SynCCap:RejectedTransferLog',
    keyDecoder: jtv.constant(undefined),
    keyEncode: function () { throw 'EncodeError'; },
    decoder: damlTypes.lazyMemo(function () {
      return jtv.object({
        seller: damlTypes.Party.decoder,
        buyer: damlTypes.Party.decoder,
        assetId: damlTypes.Text.decoder,
        technologyNode: exports.TechnologyNode.decoder,
        waferStartsPerMonth: damlTypes.Int.decoder,
        askingPricePerWafer: damlTypes.Numeric(10).decoder,
        isReclaimed: damlTypes.Bool.decoder,
        timestamp: damlTypes.Time.decoder,
      });
    }),
    encode: function (__typed__) {
      return {
        seller: damlTypes.Party.encode(__typed__.seller),
        buyer: damlTypes.Party.encode(__typed__.buyer),
        assetId: damlTypes.Text.encode(__typed__.assetId),
        technologyNode: exports.TechnologyNode.encode(__typed__.technologyNode),
        waferStartsPerMonth: damlTypes.Int.encode(__typed__.waferStartsPerMonth),
        askingPricePerWafer: damlTypes.Numeric(10).encode(__typed__.askingPricePerWafer),
        isReclaimed: damlTypes.Bool.encode(__typed__.isReclaimed),
        timestamp: damlTypes.Time.encode(__typed__.timestamp),
      };
    },
    Archive: {
      template: function () { return exports.RejectedTransferLog; },
      choiceName: 'Archive',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.decoder;
      }),
      argumentEncode: function (__typed__) { return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.Unit.decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
    },
    MarkReclaimed: {
      template: function () { return exports.RejectedTransferLog; },
      choiceName: 'MarkReclaimed',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return exports.MarkReclaimed.decoder;
      }),
      argumentEncode: function (__typed__) { return exports.MarkReclaimed.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.ContractId(exports.RejectedTransferLog).decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.ContractId(exports.RejectedTransferLog).encode(__typed__); },
    },
  },
);

damlTypes.registerTemplate(exports.RejectedTransferLog, ['09630ea91293d781ab05547c5ae9ced52c122ffaf7f239f1fabc9f8541a28cdc', '#synccap-v5']);

exports.SettlePenalty = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
    });
  }),
  encode: function (__typed__) {
    return {};
  },
};

exports.TechnologyNode = {
  N3nm: 'N3nm',
  N5nm: 'N5nm',
  N7nm: 'N7nm',
  N14nm: 'N14nm',
  keys: ['N3nm', 'N5nm', 'N7nm', 'N14nm'],
  decoder: damlTypes.lazyMemo(function () {
    return jtv.oneOf(
      jtv.constant(exports.TechnologyNode.N3nm),
      jtv.constant(exports.TechnologyNode.N5nm),
      jtv.constant(exports.TechnologyNode.N7nm),
      jtv.constant(exports.TechnologyNode.N14nm),
    );
  }),
  encode: function (__typed__) { return __typed__; },
};

exports.TransferRFQ = damlTypes.assembleTemplate(
  {
    templateId: '#synccap-v5:SynCCap:TransferRFQ',
    templateIdWithPackageId: '#09630ea91293d781ab05547c5ae9ced52c122ffaf7f239f1fabc9f8541a28cdc:SynCCap:TransferRFQ',
    keyDecoder: jtv.constant(undefined),
    keyEncode: function () { throw 'EncodeError'; },
    decoder: damlTypes.lazyMemo(function () {
      return jtv.object({
        seller: damlTypes.Party.decoder,
        buyer: damlTypes.Party.decoder,
        assetId: damlTypes.Text.decoder,
        technologyNode: exports.TechnologyNode.decoder,
        waferStartsPerMonth: damlTypes.Int.decoder,
        askingPricePerWafer: damlTypes.Numeric(10).decoder,
        commitmentStartDate: damlTypes.Text.decoder,
        commitmentEndDate: damlTypes.Text.decoder,
        lockCid: damlTypes.ContractId(exports.CapacityAssetLock).decoder,
        timestamp: damlTypes.Time.decoder,
      });
    }),
    encode: function (__typed__) {
      return {
        seller: damlTypes.Party.encode(__typed__.seller),
        buyer: damlTypes.Party.encode(__typed__.buyer),
        assetId: damlTypes.Text.encode(__typed__.assetId),
        technologyNode: exports.TechnologyNode.encode(__typed__.technologyNode),
        waferStartsPerMonth: damlTypes.Int.encode(__typed__.waferStartsPerMonth),
        askingPricePerWafer: damlTypes.Numeric(10).encode(__typed__.askingPricePerWafer),
        commitmentStartDate: damlTypes.Text.encode(__typed__.commitmentStartDate),
        commitmentEndDate: damlTypes.Text.encode(__typed__.commitmentEndDate),
        lockCid: damlTypes.ContractId(exports.CapacityAssetLock).encode(__typed__.lockCid),
        timestamp: damlTypes.Time.encode(__typed__.timestamp),
      };
    },
    AcceptTransfer: {
      template: function () { return exports.TransferRFQ; },
      choiceName: 'AcceptTransfer',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return exports.AcceptTransfer.decoder;
      }),
      argumentEncode: function (__typed__) { return exports.AcceptTransfer.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return pkg5aee9b21b8e9a4c4975b5f4c4198e6e6e8469df49e2010820e792f393db870f4.DA.Types.Tuple2(damlTypes.ContractId(exports.CapacityAsset), damlTypes.ContractId(exports.CapacityFinancials)).decoder;
      }),
      resultEncode: function (__typed__) { return pkg5aee9b21b8e9a4c4975b5f4c4198e6e6e8469df49e2010820e792f393db870f4.DA.Types.Tuple2(damlTypes.ContractId(exports.CapacityAsset), damlTypes.ContractId(exports.CapacityFinancials)).encode(__typed__); },
    },
    Archive: {
      template: function () { return exports.TransferRFQ; },
      choiceName: 'Archive',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.decoder;
      }),
      argumentEncode: function (__typed__) { return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.Unit.decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
    },
    RejectTransfer: {
      template: function () { return exports.TransferRFQ; },
      choiceName: 'RejectTransfer',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return exports.RejectTransfer.decoder;
      }),
      argumentEncode: function (__typed__) { return exports.RejectTransfer.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.ContractId(exports.RejectedTransferLog).decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.ContractId(exports.RejectedTransferLog).encode(__typed__); },
    },
    WithdrawOffer: {
      template: function () { return exports.TransferRFQ; },
      choiceName: 'WithdrawOffer',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return exports.WithdrawOffer.decoder;
      }),
      argumentEncode: function (__typed__) { return exports.WithdrawOffer.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.ContractId(exports.WithdrawnTransferLog).decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.ContractId(exports.WithdrawnTransferLog).encode(__typed__); },
    },
  },
);

damlTypes.registerTemplate(exports.TransferRFQ, ['09630ea91293d781ab05547c5ae9ced52c122ffaf7f239f1fabc9f8541a28cdc', '#synccap-v5']);

exports.WithdrawLock = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
    });
  }),
  encode: function (__typed__) {
    return {};
  },
};

exports.WithdrawOffer = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
    });
  }),
  encode: function (__typed__) {
    return {};
  },
};

exports.WithdrawnTransferLog = damlTypes.assembleTemplate(
  {
    templateId: '#synccap-v5:SynCCap:WithdrawnTransferLog',
    templateIdWithPackageId: '#09630ea91293d781ab05547c5ae9ced52c122ffaf7f239f1fabc9f8541a28cdc:SynCCap:WithdrawnTransferLog',
    keyDecoder: jtv.constant(undefined),
    keyEncode: function () { throw 'EncodeError'; },
    decoder: damlTypes.lazyMemo(function () {
      return jtv.object({
        seller: damlTypes.Party.decoder,
        buyer: damlTypes.Party.decoder,
        assetId: damlTypes.Text.decoder,
        technologyNode: exports.TechnologyNode.decoder,
        waferStartsPerMonth: damlTypes.Int.decoder,
        askingPricePerWafer: damlTypes.Numeric(10).decoder,
        timestamp: damlTypes.Time.decoder,
      });
    }),
    encode: function (__typed__) {
      return {
        seller: damlTypes.Party.encode(__typed__.seller),
        buyer: damlTypes.Party.encode(__typed__.buyer),
        assetId: damlTypes.Text.encode(__typed__.assetId),
        technologyNode: exports.TechnologyNode.encode(__typed__.technologyNode),
        waferStartsPerMonth: damlTypes.Int.encode(__typed__.waferStartsPerMonth),
        askingPricePerWafer: damlTypes.Numeric(10).encode(__typed__.askingPricePerWafer),
        timestamp: damlTypes.Time.encode(__typed__.timestamp),
      };
    },
    Archive: {
      template: function () { return exports.WithdrawnTransferLog; },
      choiceName: 'Archive',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.decoder;
      }),
      argumentEncode: function (__typed__) { return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.Unit.decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
    },
  },
);

damlTypes.registerTemplate(exports.WithdrawnTransferLog, ['09630ea91293d781ab05547c5ae9ced52c122ffaf7f239f1fabc9f8541a28cdc', '#synccap-v5']);
