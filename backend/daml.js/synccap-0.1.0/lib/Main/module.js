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
    templateId: '#synccap:Main:CapacityAsset',
    templateIdWithPackageId: '#aefdd0b40a3049b88e49c7b134013c1bdae041b9ef57e2a827b5bbf901571c30:Main:CapacityAsset',
    keyDecoder: jtv.constant(undefined),
    keyEncode: function () { throw 'EncodeError'; },
    decoder: damlTypes.lazyMemo(function () {
      return jtv.object({
        manufacturer: damlTypes.Party.decoder,
        owner: damlTypes.Party.decoder,
        assetId: damlTypes.Text.decoder,
        technologyNode: exports.TechnologyNode.decoder,
        waferStartsPerMonth: damlTypes.Int.decoder,
        costBasisPerWafer: damlTypes.Numeric(10).decoder,
        commitmentStartDate: damlTypes.Text.decoder,
        commitmentEndDate: damlTypes.Text.decoder,
        status: exports.AssetStatus.decoder,
      });
    }),
    encode: function (__typed__) {
      return {
        manufacturer: damlTypes.Party.encode(__typed__.manufacturer),
        owner: damlTypes.Party.encode(__typed__.owner),
        assetId: damlTypes.Text.encode(__typed__.assetId),
        technologyNode: exports.TechnologyNode.encode(__typed__.technologyNode),
        waferStartsPerMonth: damlTypes.Int.encode(__typed__.waferStartsPerMonth),
        costBasisPerWafer: damlTypes.Numeric(10).encode(__typed__.costBasisPerWafer),
        commitmentStartDate: damlTypes.Text.encode(__typed__.commitmentStartDate),
        commitmentEndDate: damlTypes.Text.encode(__typed__.commitmentEndDate),
        status: exports.AssetStatus.encode(__typed__.status),
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
    InitiatePenalty: {
      template: function () { return exports.CapacityAsset; },
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
    ProposeTransfer: {
      template: function () { return exports.CapacityAsset; },
      choiceName: 'ProposeTransfer',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return exports.ProposeTransfer.decoder;
      }),
      argumentEncode: function (__typed__) { return exports.ProposeTransfer.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.ContractId(exports.TransferRFQ).decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.ContractId(exports.TransferRFQ).encode(__typed__); },
    },
  },
);

damlTypes.registerTemplate(exports.CapacityAsset, ['aefdd0b40a3049b88e49c7b134013c1bdae041b9ef57e2a827b5bbf901571c30', '#synccap']);

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

exports.InitiatePenalty = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
      penaltyRate: damlTypes.Numeric(10).decoder,
      cancellationReason: damlTypes.Text.decoder,
    });
  }),
  encode: function (__typed__) {
    return {
      penaltyRate: damlTypes.Numeric(10).encode(__typed__.penaltyRate),
      cancellationReason: damlTypes.Text.encode(__typed__.cancellationReason),
    };
  },
};

exports.PenaltyAgreement = damlTypes.assembleTemplate(
  {
    templateId: '#synccap:Main:PenaltyAgreement',
    templateIdWithPackageId: '#aefdd0b40a3049b88e49c7b134013c1bdae041b9ef57e2a827b5bbf901571c30:Main:PenaltyAgreement',
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
        isSettled: damlTypes.Bool.decoder,
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
        isSettled: damlTypes.Bool.encode(__typed__.isSettled),
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

damlTypes.registerTemplate(exports.PenaltyAgreement, ['aefdd0b40a3049b88e49c7b134013c1bdae041b9ef57e2a827b5bbf901571c30', '#synccap']);

exports.ProposeTransfer = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
      secondaryBuyer: damlTypes.Party.decoder,
      askingPricePerWafer: damlTypes.Numeric(10).decoder,
    });
  }),
  encode: function (__typed__) {
    return {
      secondaryBuyer: damlTypes.Party.encode(__typed__.secondaryBuyer),
      askingPricePerWafer: damlTypes.Numeric(10).encode(__typed__.askingPricePerWafer),
    };
  },
};

exports.RejectTransfer = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
    });
  }),
  encode: function (__typed__) {
    return {};
  },
};

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
    templateId: '#synccap:Main:TransferRFQ',
    templateIdWithPackageId: '#aefdd0b40a3049b88e49c7b134013c1bdae041b9ef57e2a827b5bbf901571c30:Main:TransferRFQ',
    keyDecoder: jtv.constant(undefined),
    keyEncode: function () { throw 'EncodeError'; },
    decoder: damlTypes.lazyMemo(function () {
      return jtv.object({
        manufacturer: damlTypes.Party.decoder,
        seller: damlTypes.Party.decoder,
        buyer: damlTypes.Party.decoder,
        assetId: damlTypes.Text.decoder,
        technologyNode: exports.TechnologyNode.decoder,
        waferStartsPerMonth: damlTypes.Int.decoder,
        askingPricePerWafer: damlTypes.Numeric(10).decoder,
        commitmentStartDate: damlTypes.Text.decoder,
        commitmentEndDate: damlTypes.Text.decoder,
      });
    }),
    encode: function (__typed__) {
      return {
        manufacturer: damlTypes.Party.encode(__typed__.manufacturer),
        seller: damlTypes.Party.encode(__typed__.seller),
        buyer: damlTypes.Party.encode(__typed__.buyer),
        assetId: damlTypes.Text.encode(__typed__.assetId),
        technologyNode: exports.TechnologyNode.encode(__typed__.technologyNode),
        waferStartsPerMonth: damlTypes.Int.encode(__typed__.waferStartsPerMonth),
        askingPricePerWafer: damlTypes.Numeric(10).encode(__typed__.askingPricePerWafer),
        commitmentStartDate: damlTypes.Text.encode(__typed__.commitmentStartDate),
        commitmentEndDate: damlTypes.Text.encode(__typed__.commitmentEndDate),
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
        return damlTypes.ContractId(exports.CapacityAsset).decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.ContractId(exports.CapacityAsset).encode(__typed__); },
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
        return damlTypes.Unit.decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
    },
    WithdrawRFQ: {
      template: function () { return exports.TransferRFQ; },
      choiceName: 'WithdrawRFQ',
      argumentDecoder: damlTypes.lazyMemo(function () {
        return exports.WithdrawRFQ.decoder;
      }),
      argumentEncode: function (__typed__) { return exports.WithdrawRFQ.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () {
        return damlTypes.Unit.decoder;
      }),
      resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
    },
  },
);

damlTypes.registerTemplate(exports.TransferRFQ, ['aefdd0b40a3049b88e49c7b134013c1bdae041b9ef57e2a827b5bbf901571c30', '#synccap']);

exports.WithdrawRFQ = {
  decoder: damlTypes.lazyMemo(function () {
    return jtv.object({
    });
  }),
  encode: function (__typed__) {
    return {};
  },
};
