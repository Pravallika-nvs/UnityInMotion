import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api.ts';
import { FiLink, FiMail, FiPhone, FiBriefcase } from 'react-icons/fi';
import { Link } from 'react-router-dom';

interface Company {
  _id: string;
  companyName?: string;
  companyEmail?: string;
  companyPhoneNumber?: string;
  companyDescription?: string;
  description?: string;
  website?: string;
  address?: string;
  logo?: string;
  userId?: {
    _id?: string;
    fullName?: string;
    email?: string;
  };
}

const CompanyListPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await apiFetch('/ngo/companies');

        const companyList: Company[] = Array.isArray(response)
          ? response
          : response?.companies || response?.data || [];

        setCompanies(companyList);
      } catch (err: any) {
        console.error('Failed to fetch companies:', err);
        setError(
          err?.message || 'Failed to fetch companies.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Corporate Partners
        </h1>

        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Explore companies on our platform to find potential
          partners for your CSR initiatives.
        </p>
      </div>

      {loading && (
        <p className="text-gray-600 dark:text-gray-400">
          Loading companies...
        </p>
      )}

      {error && (
        <p className="text-red-500">
          {error}
        </p>
      )}

      {!loading && !error && companies.length === 0 && (
        <div className="bg-white dark:bg-brand-dark-200 rounded-lg shadow-md p-8 text-center">
          <FiBriefcase
            className="mx-auto mb-3 text-gray-400"
            size={40}
          />

          <p className="text-gray-600 dark:text-gray-400">
            No corporate partners found.
          </p>
        </div>
      )}

      {!loading && !error && companies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => {
            // IMPORTANT:
            // Use the Company document ID, NOT userId._id
            const companyId = company._id;

            const companyName =
              company.companyName ||
              company.userId?.fullName ||
              'Company';

            const email =
              company.companyEmail ||
              company.userId?.email ||
              '';

            const phone =
              company.companyPhoneNumber || '';

            const description =
              company.companyDescription ||
              company.description ||
              'No description available.';

            return (
              <div
                key={companyId}
                className="bg-white dark:bg-brand-dark-200 p-6 rounded-lg shadow-md flex flex-col items-center text-center"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden mb-4 ring-4 ring-brand-gold/20 bg-gray-100 dark:bg-brand-dark flex items-center justify-center">
                  {company.logo ? (
                    <img
                      src={company.logo}
                      alt={companyName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FiBriefcase
                      size={38}
                      className="text-gray-400"
                    />
                  )}
                </div>

                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  {companyName}
                </h2>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-3 flex-grow">
                  {description}
                </p>

                {email && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-3">
                    <FiMail size={13} />
                    <span className="truncate max-w-[220px]">
                      {email}
                    </span>
                  </div>
                )}

                {phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <FiPhone size={13} />
                    <span>{phone}</span>
                  </div>
                )}

                <Link
                  to={`/ngo/companies/${companyId}`}
                  className="mt-5 inline-flex items-center text-brand-gold font-semibold hover:underline"
                >
                  View Profile
                  <FiLink
                    className="ml-1"
                    size={14}
                  />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompanyListPage;