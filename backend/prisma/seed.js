require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const APPLICATION_TYPE = "merchant";
const ALLOWED_EXTENSIONS = "pdf,jpg,jpeg,png";

const requirement = ({
  code,
  label,
  description,
  maxFiles = 1,
  isRequired = true
}) => ({
  applicationType: APPLICATION_TYPE,
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
        code: "memorandum_and_articles_of_association",
        label: "Memorandum and Articles of Association",
        description:
          "Upload the company's memorandum and articles of association."
      }),
      requirement({
        code: "valid_trading_licence",
        label: "Valid Trading Licence",
        description: "Upload the current trading licence for the business."
      }),
      requirement({
        code: "directors_passport_photos",
        label: "Directors or Executive Management Passport Photos",
        description:
          "Upload coloured passport photos for at least 2 directors or executive managers.",
        maxFiles: 10
      }),
      requirement({
        code: "directors_identity_documents",
        label: "Directors or Executive Management Identity Documents",
        description:
          "Upload identity documents for at least 2 directors or executive managers.",
        maxFiles: 10
      }),
      requirement({
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
        code: "certificate_of_incorporation",
        label: "Certificate of Incorporation",
        description: "Upload a certified copy of the certificate of incorporation."
      }),
      requirement({
        code: "cr14_company_particulars",
        label: "CR14 / Company Particulars",
        description: "Upload a certified copy of CR14 or the equivalent company particulars."
      }),
      requirement({
        code: "directors_passport_photos",
        label: "Directors Passport Photos",
        description:
          "Upload coloured passport photos for the directors.",
        maxFiles: 10
      }),
      requirement({
        code: "directors_identity_documents",
        label: "Directors Identity Documents",
        description:
          "Upload certified identity documents for at least 2 directors.",
        maxFiles: 10
      }),
      requirement({
        code: "directors_proof_of_residence_or_business_address",
        label: "Directors Proof of Residence or Business Address",
        description:
          "Upload proof of residence for the directors or proof of physical address for the business premises.",
        maxFiles: 10
      }),
      requirement({
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
        code: "partnership_agreement",
        label: "Partnership Agreement",
        description: "Upload the signed partnership agreement."
      }),
      requirement({
        code: "partners_proof_of_residence_or_business_address",
        label: "Partners Proof of Residence or Business Address",
        description:
          "Upload proof of residence for the partners or proof of physical address for the business premises.",
        maxFiles: 10
      }),
      requirement({
        code: "partners_identity_documents",
        label: "Partners Identity Documents",
        description: "Upload identity documents for the business partners.",
        maxFiles: 10
      }),
      requirement({
        code: "partners_passport_photos",
        label: "Partners Passport Photos",
        description:
          "Upload coloured passport-size photos for each partner.",
        maxFiles: 10
      }),
      requirement({
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
        code: "owner_proof_of_residence_or_business_address",
        label: "Owner Proof of Residence or Business Address",
        description:
          "Upload proof of residence for the owner or proof of address for the business premises."
      }),
      requirement({
        code: "owner_identity_document",
        label: "Owner Identity Document",
        description: "Upload the trader or director identity document."
      }),
      requirement({
        code: "owner_passport_photo",
        label: "Owner Passport Photo",
        description: "Upload a coloured passport-size photo of the trader or director."
      }),
      requirement({
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
        code: "constitution",
        label: "Constitution",
        description: "Upload the organisation constitution."
      }),
      requirement({
        code: "trustees_identity_documents",
        label: "Trustees Identity Documents",
        description: "Upload identity documents for at least 2 trustees.",
        maxFiles: 10
      }),
      requirement({
        code: "trustees_passport_photos",
        label: "Trustees Passport Photos",
        description:
          "Upload coloured passport photos for the trustees.",
        maxFiles: 10
      }),
      requirement({
        code: "trustees_proof_of_residence_or_organisation_address",
        label: "Trustees Proof of Residence or Organisation Address",
        description:
          "Upload proof of residence for at least 2 trustees or proof of the organisation's physical address.",
        maxFiles: 10
      }),
      requirement({
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
        code: "executive_committee_members_list",
        label: "Executive Committee Members List",
        description: "Upload the list of executive committee members."
      }),
      requirement({
        code: "executive_committee_identity_documents",
        label: "Executive Committee Identity Documents",
        description:
          "Upload certified identity documents for at least 2 executive committee members.",
        maxFiles: 10
      }),
      requirement({
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
        code: "trader_identity_document",
        label: "Trader Identity Document",
        description: "Upload the trader's identity document."
      }),
      requirement({
        code: "trader_passport_photo",
        label: "Trader Passport Photo",
        description: "Upload a coloured passport-size photo of the trader."
      }),
      requirement({
        code: "proof_of_residence_or_police_affidavit",
        label: "Proof of Residence or Police Affidavit",
        description: "Upload proof of residence or a police affidavit."
      }),
      requirement({
        code: "valid_trading_licence_where_applicable",
        label: "Valid Trading Licence",
        description:
          "Upload a valid trading licence if one applies to the trader.",
        isRequired: false
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

async function main() {
  const seededCount = await seedMerchantRequirements();

  console.log(
    `Seeded ${seededCount} merchant document requirements across ${merchantRequirementSets.length} entity types.`
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
