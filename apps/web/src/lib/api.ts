const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    let message = "An error occurred";
    try {
      const err = await response.json();
      message = err.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return response.json();
}

export const api = {
  // ===================== AUTH =====================
  auth: {
    async register(body: any) {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },

    async login(body: any) {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },

    async getProfile() {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async updateProfile(body: any) {
      const res = await fetch(`${API_URL}/auth/profile/update`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },

    async recoverPassword(body: any) {
      const res = await fetch(`${API_URL}/auth/recover-password`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },

    async firebaseSync(body: any) {
      const res = await fetch(`${API_URL}/auth/firebase-sync`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },

    async getEmployees() {
      const res = await fetch(`${API_URL}/auth/employees`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async updateEmployeePermissions(id: string, permissions: any, position?: string) {
      const res = await fetch(`${API_URL}/auth/employees/${id}/permissions`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ permissions, position }),
      });
      return handleResponse(res);
    },

    async getAllUsers() {
      const res = await fetch(`${API_URL}/auth/admin/users`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async adminUpdateUserPermissions(id: string, permissions: any) {
      const res = await fetch(`${API_URL}/auth/admin/users/${id}/permissions`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ permissions }),
      });
      return handleResponse(res);
    },

    async getAllCompanies() {
      const res = await fetch(`${API_URL}/auth/admin/companies`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async createCompany(body: any) {
      const res = await fetch(`${API_URL}/auth/admin/companies`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },

    async updateCompany(id: string, body: any) {
      const res = await fetch(`${API_URL}/auth/admin/companies/${id}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },

    async deleteCompany(id: string) {
      const res = await fetch(`${API_URL}/auth/admin/companies/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async getAllSubscriptionKeys() {
      const res = await fetch(`${API_URL}/auth/admin/subscription-keys`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async createSubscriptionKey(body: any) {
      const res = await fetch(`${API_URL}/auth/admin/subscription-keys`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },

    async deleteSubscriptionKey(id: string) {
      const res = await fetch(`${API_URL}/auth/admin/subscription-keys/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // ===================== CONFIG & PUBLIC CATALOG =====================
  config: {
    async get() {
      const res = await fetch(`${API_URL}/calculators/config`);
      return handleResponse(res);
    },
  },

  brands: {
    async get() {
      const res = await fetch(`${API_URL}/brands`);
      return handleResponse(res);
    },
    async create(body: any) {
      const res = await fetch(`${API_URL}/brands`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
    async delete(id: string) {
      const res = await fetch(`${API_URL}/brands/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  categories: {
    async get() {
      const res = await fetch(`${API_URL}/categories`);
      return handleResponse(res);
    },
    async create(body: any) {
      const res = await fetch(`${API_URL}/categories`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
    async delete(id: string) {
      const res = await fetch(`${API_URL}/categories/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  products: {
    async get() {
      const res = await fetch(`${API_URL}/catalog`);
      return handleResponse(res);
    },
    async create(body: any) {
      const res = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
    async update(id: string, body: any) {
      const res = await fetch(`${API_URL}/products/${id}/update`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
    async delete(id: string) {
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // ===================== WOODWORK =====================
  woodwork: {
    async get() {
      const res = await fetch(`${API_URL}/woodwork`);
      return handleResponse(res);
    },
    async save(body: any) {
      const res = await fetch(`${API_URL}/woodwork`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
    async delete(id: string) {
      const res = await fetch(`${API_URL}/woodwork/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // ===================== DOORS =====================
  doors: {
    async getAll() {
      const res = await fetch(`${API_URL}/doors/all`);
      return handleResponse(res);
    },
    async saveTemplate(body: any) {
      const res = await fetch(`${API_URL}/doors/templates`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
    async deleteTemplate(id: string) {
      const res = await fetch(`${API_URL}/doors/templates/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async saveVariant(body: any) {
      const res = await fetch(`${API_URL}/doors/variants`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
    async deleteVariant(id: string) {
      const res = await fetch(`${API_URL}/doors/variants/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async saveFinish(body: any) {
      const res = await fetch(`${API_URL}/doors/finishes`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
    async deleteFinish(id: string) {
      const res = await fetch(`${API_URL}/doors/finishes/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async saveAddonGroup(body: any) {
      const res = await fetch(`${API_URL}/doors/addons/groups`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
    async deleteAddonGroup(id: string) {
      const res = await fetch(`${API_URL}/doors/addons/groups/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async saveAddon(body: any) {
      const res = await fetch(`${API_URL}/doors/addons`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
    async deleteAddon(id: string) {
      const res = await fetch(`${API_URL}/doors/addons/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async saveSettings(body: any) {
      const res = await fetch(`${API_URL}/doors/settings`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
  },

  // ===================== ESTIMATIONS =====================
  calculations: {
    async calculateConstruction(body: any) {
      const res = await fetch(`${API_URL}/calculations/construction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
  },

  // ===================== QUOTES =====================
  quotes: {
    async create(body: any) {
      const res = await fetch(`${API_URL}/quotes`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
    async get() {
      const res = await fetch(`${API_URL}/quotes`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async delete(id: string) {
      const res = await fetch(`${API_URL}/quotes/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // ===================== PROJECTS =====================
  projects: {
    async get() {
      const res = await fetch(`${API_URL}/projects`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async create(body: any) {
      const res = await fetch(`${API_URL}/projects`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
    async update(id: string, body: any) {
      const res = await fetch(`${API_URL}/projects/${id}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },
    async delete(id: string) {
      const res = await fetch(`${API_URL}/projects/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },
};
