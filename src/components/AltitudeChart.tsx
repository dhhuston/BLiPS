import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { FlightPoint, UnitSystem } from '../types/index';
import { metersToFeet } from '../constants/index';

interface AltitudeChartProps {
  path: FlightPoint[];
  unitSystem: UnitSystem;
}

const AltitudeChart: React.FC<AltitudeChartProps> = ({ path, unitSystem }) => {
  const isImperial = unitSystem === 'imperial';

  const chartData = path.map(p => ({
    x: p.time / 60, // Convert seconds to minutes
    y: isImperial 
      ? (metersToFeet(p.altitude)) / 1000 // Convert meters to kilofeet
      : p.altitude / 1000, // Convert meters to kilometers
  }));

  const yAxisUnit = isImperial ? 'kft' : 'km';
  const legendName = isImperial ? 'Altitude (kft)' : 'Altitude (km)';

  const options = {
    chart: {
      type: 'line' as const,
      background: 'transparent',
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    theme: {
      mode: 'dark' as const
    },
    stroke: {
      curve: 'smooth' as const,
      width: 3,
      colors: ['#2dd4bf']
    },
    grid: {
      borderColor: '#4b5563',
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      }
    },
    xaxis: {
      type: 'numeric' as const,
      labels: {
        style: {
          colors: '#9ca3af'
        }
      },
      title: {
        text: 'Time (minutes)',
        style: {
          color: '#9ca3af'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#9ca3af'
        },
        formatter: (value: number) => `${value.toFixed(1)} ${yAxisUnit}`
      },
      title: {
        text: legendName,
        style: {
          color: '#9ca3af'
        }
      }
    },
    tooltip: {
      theme: 'dark',
      x: {
        formatter: (value: number) => `${value.toFixed(1)} min`
      },
      y: {
        formatter: (value: number) => `${value.toFixed(2)} ${yAxisUnit}`
      }
    },
    legend: {
      labels: {
        colors: '#d1d5db'
      }
    },
    markers: {
      size: 0
    },
    dataLabels: {
      enabled: false
    }
  };

  const series = [
    {
      name: legendName,
      data: chartData
    }
  ];

  return (
    <div className="w-full h-full">
      <ReactApexChart
        options={options}
        series={series}
        type="line"
        height="100%"
      />
    </div>
  );
};

export default AltitudeChart;