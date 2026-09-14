import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiBriefcase,
  FiMail,
  FiPhone,
  FiGlobe,
  FiMapPin
} from 'react-icons/fi';
import { apiFetch } from '../../services/api.ts';

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
    fullName?: string;
    email?: string;
  };
}

const CompanyDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCompany = async () => {
      if (!id) {
        setError('Company ID is missing.');
        setLoading(false);
        return;
      }

      try {
        const response = await apiFetch(`/ngo/companies/${id}`);

        const companyData =
          response?.company ||
          response?.data?.company ||
          response?.data ||
          response;

        setCompany(companyData);
      } catch (err: any) {
        console.error('Failed to fetch company:', err);
        setError(
          err?.message || 'Failed to load company profile.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-600 dark:text-gray-400">
          Loading company profile...
        </p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="space-y-6">
        <Link
          to="/ngo/companies"
          className="inline-flex items-center text-brand-gold font-semibold hover:underline"
        >
          <FiArrowLeft className="mr-2" />
          Back to Corporate Partners
        </Link>

        <div className="bg-white dark:bg-brand-dark-200 rounded-lg shadow-md p-8 text-center">
          <p className="text-red-500">
            {error || 'Company not found.'}
          </p>
        </div>
      </div>
    );
  }

  const companyName =
    company.companyName ||
    company.userId?.fullName ||
    'Company';

  const email =
    company.companyEmail ||
    company.userId?.email ||
    '';

  const phone = company.companyPhoneNumber || '';

  const description =
    company.companyDescription ||
    company.description ||
    'No description available.';

  return (
    <div className="space-y-6">
      <Link
        to="/ngo/companies"
        className="inline-flex items-center text-brand-gold font-semibold hover:underline"
      >
        <FiArrowLeft className="mr-2" />
        Back to Corporate Partners
      </Link>

      <div className="bg-white dark:bg-brand-dark-200 rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="flex-shrink-0">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={companyName}
                  className="w-32 h-32 rounded-full object-cover ring-4 ring-brand-gold/20"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-100 dark:bg-brand-dark flex items-center justify-center ring-4 ring-brand-gold/20">
                  <FiBriefcase
                    size={48}
                    className="text-gray-400"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                {companyName}
              </h1>

              <p className="mt-3 text-gray-600 dark:text-gray-400">
                {description}
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {email && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-brand-dark">
                <FiMail className="text-brand-gold" size={20} />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Email
                  </p>
                  <p className="text-gray-800 dark:text-white break-all">
                    {email}
                  </p>
                </div>
              </div>
            )}

            {phone && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-brand-dark">
                <FiPhone className="text-brand-gold" size={20} />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Phone
                  </p>
                  <p className="text-gray-800 dark:text-white">
                    {phone}
                  </p>
                </div>
              </div>
            )}

            {company.website && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-brand-dark">
                <FiGlobe className="text-brand-gold" size={20} />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Website
                  </p>
                  <a
                    href={
                      company.website.startsWith('http')
                        ? company.website
                        : `https://${company.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-gold hover:underline break-all"
                  >
                    {company.website}
                  </a>
                </div>
              </div>
            )}

            {company.address && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-brand-dark">
                <FiMapPin className="text-brand-gold" size={20} />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Address
                  </p>
                  <p className="text-gray-800 dark:text-white">
                    {company.address}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailsPage;