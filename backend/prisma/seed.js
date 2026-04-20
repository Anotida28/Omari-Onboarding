require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ALLOWED_EXTENSIONS = "pdf,jpg,jpeg,png";

const requirement = ({
  applicationType,
  code,
  label,
  description,
  maxFiles = 1,
  isRequired = true
}) => ({
  applicationType,
  code,
  label,
  description,
  allowedExtensions: ALLOWED_EXTENSIONS,
  maxFiles,
  isRequired
});

const merchantRequirementSets = [
  {
    entityType: "public_limited_company",
    requirements: [
      requirement({
        applicationType: "merchant",
        code: "memorandum_and_articles_of_association",
        label: "Memorandum and Articles of Association",
        description:
          "Upload the company's memorandum and articles of association."
      }),
      requirement({
        applicationType: "merchant",
        code: "valid_trading_licence",
        label: "Valid Trading Licence",
        description: "Upload the current trading licence for the business."
      }),
      requirement({
        applicationType: "merchant",
        code: "directors_passport_photos",
        label: "Directors or Executive Management Passport Photos",
        description:
          "Upload coloured passport photos for at least 2 directors or executive managers.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "merchant",
        code: "directors_identity_documents",
        label: "Directors or Executive Management Identity Documents",
        description:
          "Upload identity documents for at least 2 directors or executive managers.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "merchant",
        code: "directors_proof_of_residence",
        label: "Directors or Executive Management Proof of Residence",
        description:
          "Upload proof of residence for at least 2 directors or executive managers.",
        maxFiles: 10
      })
    ]
  },
  {
    entityType: "private_limited_company",
    requirements: [
      requirement({
        applicationType: "merchant",
        code: "certificate_of_incorporation",
        label: "Certificate of Incorporation",
        description: "Upload a certified copy of the certificate of incorporation."
      }),
      requirement({
        applicationType: "merchant",
        code: "cr14_company_particulars",
        label: "CR14 / Company Particulars",
        description: "Upload a certified copy of CR14 or the equivalent company particulars."
      }),
      requirement({
        applicationType: "merchant",
        code: "directors_passport_photos",
        label: "Directors Passport Photos",
        description:
          "Upload coloured passport photos for the directors.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "merchant",
        code: "directors_identity_documents",
        label: "Directors Identity Documents",
        description:
          "Upload certified identity documents for at least 2 directors.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "merchant",
        code: "directors_proof_of_residence_or_business_address",
        label: "Directors Proof of Residence or Business Address",
        description:
          "Upload proof of residence for the directors or proof of physical address for the business premises.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "merchant",
        code: "valid_trading_licence",
        label: "Valid Trading Licence",
        description: "Upload the current trading licence for the business."
      })
    ]
  },
  {
    entityType: "partnership",
    requirements: [
      requirement({
        applicationType: "merchant",
        code: "partnership_agreement",
        label: "Partnership Agreement",
        description: "Upload the signed partnership agreement."
      }),
      requirement({
        applicationType: "merchant",
        code: "partners_proof_of_residence_or_business_address",
        label: "Partners Proof of Residence or Business Address",
        description:
          "Upload proof of residence for the partners or proof of physical address for the business premises.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "merchant",
        code: "partners_identity_documents",
        label: "Partners Identity Documents",
        description: "Upload identity documents for the business partners.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "merchant",
        code: "partners_passport_photos",
        label: "Partners Passport Photos",
        description:
          "Upload coloured passport-size photos for each partner.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "merchant",
        code: "valid_trading_licence",
        label: "Valid Trading Licence",
        description: "Upload the current trading licence for the partnership."
      })
    ]
  },
  {
    entityType: "sole_trader",
    requirements: [
      requirement({
        applicationType: "merchant",
        code: "owner_proof_of_residence_or_business_address",
        label: "Owner Proof of Residence or Business Address",
        description:
          "Upload proof of residence for the owner or proof of address for the business premises."
      }),
      requirement({
        applicationType: "merchant",
        code: "owner_identity_document",
        label: "Owner Identity Document",
        description: "Upload the trader or director identity document."
      }),
      requirement({
        applicationType: "merchant",
        code: "owner_passport_photo",
        label: "Owner Passport Photo",
        description: "Upload a coloured passport-size photo of the trader or director."
      }),
      requirement({
        applicationType: "merchant",
        code: "valid_trading_licence_or_operator_permit",
        label: "Valid Trading Licence or Operator Permit",
        description:
          "Upload the valid trading licence, operator licence, route permit, or equivalent licence."
      })
    ]
  },
  {
    entityType: "non_profit_organisation",
    requirements: [
      requirement({
        applicationType: "merchant",
        code: "constitution",
        label: "Constitution",
        description: "Upload the organisation constitution."
      }),
      requirement({
        applicationType: "merchant",
        code: "trustees_identity_documents",
        label: "Trustees Identity Documents",
        description: "Upload identity documents for at least 2 trustees.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "merchant",
        code: "trustees_passport_photos",
        label: "Trustees Passport Photos",
        description:
          "Upload coloured passport photos for the trustees.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "merchant",
        code: "trustees_proof_of_residence_or_organisation_address",
        label: "Trustees Proof of Residence or Organisation Address",
        description:
          "Upload proof of residence for at least 2 trustees or proof of the organisation's physical address.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "merchant",
        code: "resolution_to_open_merchant_account",
        label: "Resolution to Open Merchant Account",
        description:
          "Upload the resolution authorising the opening of the merchant account."
      })
    ]
  },
  {
    entityType: "society_association_club",
    requirements: [
      requirement({
        applicationType: "merchant",
        code: "executive_committee_members_list",
        label: "Executive Committee Members List",
        description: "Upload the list of executive committee members."
      }),
      requirement({
        applicationType: "merchant",
        code: "executive_committee_identity_documents",
        label: "Executive Committee Identity Documents",
        description:
          "Upload certified identity documents for at least 2 executive committee members.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "merchant",
        code: "committee_proof_of_residence_or_outlet_address",
        label: "Committee Proof of Residence or Outlet Address",
        description:
          "Upload proof of residence for the committee members or proof of the outlet's physical address.",
        maxFiles: 10
      })
    ]
  },
  {
    entityType: "street_vendor",
    requirements: [
      requirement({
        applicationType: "merchant",
        code: "trader_identity_document",
        label: "Trader Identity Document",
        description: "Upload the trader's identity document."
      }),
      requirement({
        applicationType: "merchant",
        code: "trader_passport_photo",
        label: "Trader Passport Photo",
        description: "Upload a coloured passport-size photo of the trader."
      }),
      requirement({
        applicationType: "merchant",
        code: "proof_of_residence_or_police_affidavit",
        label: "Proof of Residence or Police Affidavit",
        description: "Upload proof of residence or a police affidavit."
      }),
      requirement({
        applicationType: "merchant",
        code: "valid_trading_licence_where_applicable",
        label: "Valid Trading Licence",
        description:
          "Upload a valid trading licence if one applies to the trader.",
        isRequired: false
      })
    ]
  }
];

const agentRequirementSets = [
  {
    entityType: "private_limited_company",
    requirements: [
      requirement({
        applicationType: "agent",
        code: "certificate_of_incorporation",
        label: "Certificate of Incorporation",
        description: "Upload the certificate of incorporation for the agent business."
      }),
      requirement({
        applicationType: "agent",
        code: "cr6_or_company_particulars",
        label: "CR6 or Company Particulars",
        description: "Upload CR6 or the latest company particulars showing directors."
      }),
      requirement({
        applicationType: "agent",
        code: "valid_tax_clearance",
        label: "Valid Tax Clearance",
        description: "Upload a current tax clearance certificate."
      }),
      requirement({
        applicationType: "agent",
        code: "directors_identity_documents",
        label: "Directors Identity Documents",
        description: "Upload identity documents for company directors.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "agent",
        code: "directors_passport_photos",
        label: "Directors Passport Photos",
        description: "Upload passport photos for company directors.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "agent",
        code: "proof_of_business_or_directors_address",
        label: "Proof of Business or Directors Address",
        description:
          "Upload proof of residence for directors or proof of address for the business premises.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "agent",
        code: "valid_trading_licence",
        label: "Valid Trading Licence",
        description: "Upload the business trading licence."
      }),
      requirement({
        applicationType: "agent",
        code: "recent_bank_statement",
        label: "Recent Bank Statement",
        description: "Upload a recent bank statement for the settlement account."
      })
    ]
  },
  {
    entityType: "partnership",
    requirements: [
      requirement({
        applicationType: "agent",
        code: "partnership_agreement",
        label: "Partnership Agreement",
        description: "Upload the signed partnership agreement."
      }),
      requirement({
        applicationType: "agent",
        code: "partners_identity_documents",
        label: "Partners Identity Documents",
        description: "Upload identity documents for the partners.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "agent",
        code: "partners_passport_photos",
        label: "Partners Passport Photos",
        description: "Upload passport photos for the partners.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "agent",
        code: "valid_tax_clearance",
        label: "Valid Tax Clearance",
        description: "Upload the current tax clearance certificate."
      }),
      requirement({
        applicationType: "agent",
        code: "valid_trading_licence",
        label: "Valid Trading Licence",
        description: "Upload the partnership trading licence."
      }),
      requirement({
        applicationType: "agent",
        code: "recent_bank_statement",
        label: "Recent Bank Statement",
        description: "Upload a recent bank statement for the business account."
      })
    ]
  },
  {
    entityType: "sole_trader",
    requirements: [
      requirement({
        applicationType: "agent",
        code: "owner_identity_document",
        label: "Owner Identity Document",
        description: "Upload the identity document for the sole trader."
      }),
      requirement({
        applicationType: "agent",
        code: "owner_passport_photo",
        label: "Owner Passport Photo",
        description: "Upload a passport photo for the sole trader."
      }),
      requirement({
        applicationType: "agent",
        code: "proof_of_residence",
        label: "Proof of Residence",
        description: "Upload proof of residence for the sole trader."
      }),
      requirement({
        applicationType: "agent",
        code: "valid_trading_licence_or_operator_permit",
        label: "Valid Trading Licence or Operator Permit",
        description: "Upload the current trading licence or operator permit."
      }),
      requirement({
        applicationType: "agent",
        code: "recent_bank_statement",
        label: "Recent Bank Statement",
        description: "Upload a recent bank statement for the settlement account."
      })
    ]
  },
  {
    entityType: "non_profit_organisation",
    requirements: [
      requirement({
        applicationType: "agent",
        code: "constitution",
        label: "Constitution",
        description: "Upload the organization's constitution."
      }),
      requirement({
        applicationType: "agent",
        code: "trustees_identity_documents",
        label: "Trustees Identity Documents",
        description: "Upload identity documents for trustees.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "agent",
        code: "trustees_passport_photos",
        label: "Trustees Passport Photos",
        description: "Upload passport photos for trustees.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "agent",
        code: "proof_of_organisation_address",
        label: "Proof of Organisation Address",
        description: "Upload proof of address for the organisation or trustees."
      }),
      requirement({
        applicationType: "agent",
        code: "recent_bank_statement",
        label: "Recent Bank Statement",
        description: "Upload a recent bank statement for the organisation."
      })
    ]
  }
];

const payerRequirementSets = [
  {
    entityType: "private_limited_company",
    requirements: [
      requirement({
        applicationType: "payer",
        code: "certificate_of_incorporation",
        label: "Certificate of Incorporation",
        description: "Upload the certificate of incorporation for the biller or payer."
      }),
      requirement({
        applicationType: "payer",
        code: "company_particulars",
        label: "Company Particulars",
        description: "Upload CR6, CR14, or the latest company particulars."
      }),
      requirement({
        applicationType: "payer",
        code: "valid_tax_clearance",
        label: "Valid Tax Clearance",
        description: "Upload the current tax clearance certificate."
      }),
      requirement({
        applicationType: "payer",
        code: "signatories_identity_documents",
        label: "Signatories Identity Documents",
        description: "Upload identity documents for the authorized signatories.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "payer",
        code: "proof_of_business_address",
        label: "Proof of Business Address",
        description: "Upload proof of the business physical address."
      }),
      requirement({
        applicationType: "payer",
        code: "recent_bank_statement",
        label: "Recent Bank Statement",
        description: "Upload a recent bank statement for the settlement account."
      })
    ]
  },
  {
    entityType: "partnership",
    requirements: [
      requirement({
        applicationType: "payer",
        code: "partnership_agreement",
        label: "Partnership Agreement",
        description: "Upload the signed partnership agreement."
      }),
      requirement({
        applicationType: "payer",
        code: "partners_identity_documents",
        label: "Partners Identity Documents",
        description: "Upload identity documents for the partners.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "payer",
        code: "valid_tax_clearance",
        label: "Valid Tax Clearance",
        description: "Upload the current tax clearance certificate."
      }),
      requirement({
        applicationType: "payer",
        code: "proof_of_business_address",
        label: "Proof of Business Address",
        description: "Upload proof of address for the billing or operating premises."
      }),
      requirement({
        applicationType: "payer",
        code: "recent_bank_statement",
        label: "Recent Bank Statement",
        description: "Upload a recent bank statement for the settlement account."
      })
    ]
  },
  {
    entityType: "sole_trader",
    requirements: [
      requirement({
        applicationType: "payer",
        code: "owner_identity_document",
        label: "Owner Identity Document",
        description: "Upload the identity document of the sole trader."
      }),
      requirement({
        applicationType: "payer",
        code: "proof_of_residence_or_business_address",
        label: "Proof of Residence or Business Address",
        description: "Upload proof of residence or proof of business address."
      }),
      requirement({
        applicationType: "payer",
        code: "valid_trading_licence_or_operator_permit",
        label: "Valid Trading Licence or Operator Permit",
        description: "Upload the valid trading licence or equivalent operating permit."
      }),
      requirement({
        applicationType: "payer",
        code: "recent_bank_statement",
        label: "Recent Bank Statement",
        description: "Upload a recent bank statement for the settlement account."
      })
    ]
  },
  {
    entityType: "non_profit_organisation",
    requirements: [
      requirement({
        applicationType: "payer",
        code: "constitution",
        label: "Constitution",
        description: "Upload the constitution or founding document."
      }),
      requirement({
        applicationType: "payer",
        code: "trustees_identity_documents",
        label: "Trustees Identity Documents",
        description: "Upload identity documents for trustees or office bearers.",
        maxFiles: 10
      }),
      requirement({
        applicationType: "payer",
        code: "resolution_to_enter_payments_agreement",
        label: "Resolution To Enter Payments Agreement",
        description: "Upload the resolution authorizing the organisation to enter the payments agreement."
      }),
      requirement({
        applicationType: "payer",
        code: "proof_of_organisation_address",
        label: "Proof of Organisation Address",
        description: "Upload proof of the organisation's address."
      }),
      requirement({
        applicationType: "payer",
        code: "recent_bank_statement",
        label: "Recent Bank Statement",
        description: "Upload a recent bank statement for the settlement account."
      })
    ]
  }
];

async function seedMerchantRequirements() {
  let seededCount = 0;

  for (const group of merchantRequirementSets) {
    for (const [index, item] of group.requirements.entries()) {
      await prisma.documentRequirement.upsert({
        where: {
          applicationType_entityType_code: {
            applicationType: item.applicationType,
            entityType: group.entityType,
            code: item.code
          }
        },
        create: {
          ...item,
          entityType: group.entityType,
          sortOrder: index + 1
        },
        update: {
          label: item.label,
          description: item.description,
          allowedExtensions: item.allowedExtensions,
          maxFiles: item.maxFiles,
          isRequired: item.isRequired,
          sortOrder: index + 1
        }
      });

      seededCount += 1;
    }
  }

  return seededCount;
}

async function seedAgentRequirements() {
  let seededCount = 0;

  for (const group of agentRequirementSets) {
    for (const [index, item] of group.requirements.entries()) {
      await prisma.documentRequirement.upsert({
        where: {
          applicationType_entityType_code: {
            applicationType: item.applicationType,
            entityType: group.entityType,
            code: item.code
          }
        },
        create: {
          ...item,
          entityType: group.entityType,
          sortOrder: index + 1
        },
        update: {
          label: item.label,
          description: item.description,
          allowedExtensions: item.allowedExtensions,
          maxFiles: item.maxFiles,
          isRequired: item.isRequired,
          sortOrder: index + 1
        }
      });

      seededCount += 1;
    }
  }

  return seededCount;
}

async function seedPayerRequirements() {
  let seededCount = 0;

  for (const group of payerRequirementSets) {
    for (const [index, item] of group.requirements.entries()) {
      await prisma.documentRequirement.upsert({
        where: {
          applicationType_entityType_code: {
            applicationType: item.applicationType,
            entityType: group.entityType,
            code: item.code
          }
        },
        create: {
          ...item,
          entityType: group.entityType,
          sortOrder: index + 1
        },
        update: {
          label: item.label,
          description: item.description,
          allowedExtensions: item.allowedExtensions,
          maxFiles: item.maxFiles,
          isRequired: item.isRequired,
          sortOrder: index + 1
        }
      });

      seededCount += 1;
    }
  }

  return seededCount;
}

async function main() {
  const merchantCount = await seedMerchantRequirements();
  const agentCount = await seedAgentRequirements();
  const payerCount = await seedPayerRequirements();

  console.log(
    `Seeded ${merchantCount} merchant requirements across ${merchantRequirementSets.length} entity types, ${agentCount} agent requirements across ${agentRequirementSets.length} entity types, and ${payerCount} payer requirements across ${payerRequirementSets.length} entity types.`
  );
}

main()
  .catch((error) => {
    console.error("Merchant document requirement seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
