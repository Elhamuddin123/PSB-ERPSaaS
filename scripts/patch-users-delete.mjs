import fs from "fs";

const path = "api/users-router.ts";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  `if (Object.keys(update).length === 0) {
        return { success: true, message: "User deactivated successfully." };
      }`,
  `if (Object.keys(update).length === 0) {
        return { success: true };
      }`,
);

content = content.replace(
  `      await auditLog({
        ctx,
        action: "update_user",
        entityType: "user",
        entityId: input.id,
        newValues: update,
      });

      return { success: true, message: "User deactivated successfully." };
    }),

  //`,
  `      await auditLog({
        ctx,
        action: "update_user",
        entityType: "user",
        entityId: input.id,
        newValues: update,
      });

      return { success: true };
    }),

  //`,
);

content = content.replace(
  `      await auditLog({
        ctx,
        action: "delete_user",
        entityType: "user",
        entityId: input.id,
        oldValues: { name: target[0].name },
      });

      return { success: true, message: "User deactivated successfully." };
    }),

  //`,
  `      await auditLog({
        ctx,
        action: "delete_user",
        entityType: "user",
        entityId: input.id,
        oldValues: { name: target[0].name, status: target[0].status },
        newValues: { status: "inactive" },
      });

      return { success: true, message: "User deactivated successfully." };
    }),

  //`,
);

fs.writeFileSync(path, content);
console.log("patched");
