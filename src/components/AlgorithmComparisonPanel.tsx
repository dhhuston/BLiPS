import React, { useState, useEffect } from 'react';
import { AlgorithmComparisonReport, generateComparisonReport, ComparisonResults, ConstantsComparison } from '../services/algorithmComparison';

interface AlgorithmComparisonPanelProps {
  className?: string;
}

export const AlgorithmComparisonPanel: React.FC<AlgorithmComparisonPanelProps> = ({ className = '' }) => {
  const [report, setReport] = useState<AlgorithmComparisonReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'constants' | 'validation'>('overview');

  const runComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const comparisonReport = await generateComparisonReport();
      setReport(comparisonReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getAssessmentColor = (assessment: string) => {
    switch (assessment) {
      case 'EXCELLENT': return 'text-green-600 bg-green-50 border-green-200';
      case 'GOOD': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'ACCEPTABLE': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'NEEDS_IMPROVEMENT': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'POOR': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const renderOverview = () => {
    if (!report) return null;

    const { summary } = report;
    const passRate = summary.totalTests > 0 ? (summary.passedTests / summary.totalTests * 100) : 0;
    const constantsRate = summary.constantsTotal > 0 ? (summary.constantsMatching / summary.constantsTotal * 100) : 0;

    return (
      <div className="space-y-6">
        {/* Overall Assessment */}
        <div className={`p-4 border rounded-lg ${getAssessmentColor(summary.overallAssessment)}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Overall Assessment</h3>
              <p className="text-sm opacity-80">Comparison with established balloon prediction algorithms</p>
            </div>
            <div className="text-2xl font-bold">{summary.overallAssessment}</div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 border rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-2">Validation Tests</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Tests:</span>
                <span className="font-medium">{summary.totalTests}</span>
              </div>
              <div className="flex justify-between">
                <span>Passed:</span>
                <span className="font-medium text-green-600">{summary.passedTests}</span>
              </div>
              <div className="flex justify-between">
                <span>Failed:</span>
                <span className="font-medium text-red-600">{summary.failedTests}</span>
              </div>
              <div className="flex justify-between">
                <span>Pass Rate:</span>
                <span className="font-medium">{passRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 border rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-2">Physics Constants</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Constants:</span>
                <span className="font-medium">{summary.constantsTotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Matching:</span>
                <span className="font-medium text-green-600">{summary.constantsMatching}</span>
              </div>
              <div className="flex justify-between">
                <span>Mismatched:</span>
                <span className="font-medium text-red-600">{summary.constantsTotal - summary.constantsMatching}</span>
              </div>
              <div className="flex justify-between">
                <span>Match Rate:</span>
                <span className="font-medium">{constantsRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {summary.recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">📋 Recommendations</h4>
            <ul className="space-y-1 text-blue-700">
              {summary.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderConstants = () => {
    if (!report) return null;

    return (
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Physics Constants Comparison</h4>
          <p className="text-sm text-gray-600">
            Comparing our algorithm's physics constants with established standards from CUSF, HABHUB, and other recognized calculators.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 border-b">Constant</th>
                <th className="text-right p-3 border-b">Our Value</th>
                <th className="text-right p-3 border-b">Standard Value</th>
                <th className="text-right p-3 border-b">Difference (%)</th>
                <th className="text-center p-3 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.constantsComparison.map((constant, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{constant.constant}</td>
                  <td className="p-3 text-right font-mono text-sm">{constant.ourValue}</td>
                  <td className="p-3 text-right font-mono text-sm">{constant.standardValue}</td>
                  <td className="p-3 text-right">
                    <span className={`px-2 py-1 rounded text-xs ${
                      constant.percentDifference === 0 ? 'bg-green-100 text-green-800' :
                      constant.withinAcceptableRange ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {constant.percentDifference.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      constant.withinAcceptableRange ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {constant.withinAcceptableRange ? '✅ Match' : '❌ Mismatch'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderValidation = () => {
    if (!report) return null;

    return (
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Validation Test Results</h4>
          <p className="text-sm text-gray-600">
            Testing our algorithm against known scenarios from established calculators like CUSF, HABHUB, and Launch With Us.
          </p>
        </div>

        {report.validationResults.map((result, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h5 className="font-semibold text-lg">{result.testCase.name}</h5>
                <p className="text-sm text-gray-600">{result.testCase.description}</p>
                <p className="text-xs text-gray-500 mt-1">Source: {result.testCase.source}</p>
              </div>
              <span className={`px-3 py-1 rounded text-sm font-medium ${
                result.withinTolerance.overall ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {result.withinTolerance.overall ? '✅ PASS' : '❌ FAIL'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <div className="bg-gray-50 p-3 rounded">
                <h6 className="font-medium text-sm mb-2">Burst Altitude</h6>
                <div className="space-y-1 text-sm">
                  <div>Expected: {result.testCase.expectedResults.burstAltitude?.toLocaleString()}m</div>
                  <div>Our Result: {result.ourResults.burstAltitude.toLocaleString()}m</div>
                  <div className={`font-medium ${Math.abs(result.deviations.burstAltitudeDeviation) <= (result.testCase.tolerance.burstAltitude || Infinity) ? 'text-green-600' : 'text-red-600'}`}>
                    Deviation: {result.deviations.burstAltitudeDeviation > 0 ? '+' : ''}{result.deviations.burstAltitudeDeviation.toLocaleString()}m
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <h6 className="font-medium text-sm mb-2">Ascent Rate</h6>
                <div className="space-y-1 text-sm">
                  <div>Expected: {result.testCase.expectedResults.ascentRate}m/s</div>
                  <div>Our Result: {result.ourResults.ascentRate.toFixed(2)}m/s</div>
                  <div className={`font-medium ${Math.abs(result.deviations.ascentRateDeviation) <= (result.testCase.tolerance.ascentRate || Infinity) ? 'text-green-600' : 'text-red-600'}`}>
                    Deviation: {result.deviations.ascentRateDeviation > 0 ? '+' : ''}{result.deviations.ascentRateDeviation.toFixed(2)}m/s
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <h6 className="font-medium text-sm mb-2">Flight Time</h6>
                <div className="space-y-1 text-sm">
                  <div>Expected: {Math.round((result.testCase.expectedResults.flightTime || 0) / 60)}min</div>
                  <div>Our Result: {Math.round(result.ourResults.flightTime / 60)}min</div>
                  <div className={`font-medium ${Math.abs(result.deviations.flightTimeDeviation) <= (result.testCase.tolerance.flightTime || Infinity) ? 'text-green-600' : 'text-red-600'}`}>
                    Deviation: {result.deviations.flightTimeDeviation > 0 ? '+' : ''}{Math.round(result.deviations.flightTimeDeviation / 60)}min
                  </div>
                </div>
              </div>
            </div>

            {result.notes.length > 0 && (
              <div className="bg-blue-50 p-3 rounded">
                <h6 className="font-medium text-sm mb-1">Notes:</h6>
                <ul className="text-sm space-y-1">
                  {result.notes.map((note, noteIndex) => (
                    <li key={noteIndex} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Algorithm Comparison</h2>
            <p className="text-gray-600">Compare our prediction algorithm with established standards</p>
          </div>
          <button
            onClick={runComparison}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Running...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Run Comparison</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
            <div className="font-medium">Error running comparison:</div>
            <div className="text-sm">{error}</div>
          </div>
        )}

        {report && (
          <>
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8">
                {['overview', 'constants', 'validation'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            <div className="min-h-[400px]">
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'constants' && renderConstants()}
              {activeTab === 'validation' && renderValidation()}
            </div>
          </>
        )}

        {!report && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">Ready to Compare</h3>
            <p className="text-gray-500 mb-4">
              Run a comparison to validate our algorithm against established balloon prediction standards.
            </p>
            <p className="text-sm text-gray-400">
              This will test our physics constants, burst calculations, and flight predictions against known benchmarks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 