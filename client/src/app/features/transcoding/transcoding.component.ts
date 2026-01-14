import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { TranscodingService } from '../../core/services/transcoding.service';
import {
  TranscodingSummary,
  DecisionOverTime,
  TranscodeReason,
  DeviceStats,
  FormatData,
  FormatCombination,
  MediaTranscodeStats,
  TranscodingUser,
  Recommendation,
  TimePeriod,
  CodecMediaItem
} from '../../core/models/transcoding.model';

@Component({
  selector: 'app-transcoding',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './transcoding.component.html'
})
export class TranscodingComponent implements OnInit {
  // Tab state
  activeTab: 'overview' | 'devices' | 'formats' | 'recommendations' = 'overview';

  // Filter state
  selectedPeriod: TimePeriod = '30d';
  selectedUserId: string | null = null;
  users: TranscodingUser[] = [];

  // Loading states
  loading = true;
  loadingDevices = false;
  loadingFormats = false;
  loadingRecommendations = false;

  // Data
  summary: TranscodingSummary | null = null;
  decisionsOverTime: DecisionOverTime[] = [];
  transcodeReasons: TranscodeReason[] = [];
  devices: DeviceStats[] = [];
  formatData: FormatData | null = null;
  combinations: FormatCombination[] = [];
  topMedia: MediaTranscodeStats[] = [];
  recommendations: Recommendation[] = [];

  // UI state
  expandedDevices = new Set<string>();

  // Codec modal state
  codecModalOpen = false;
  codecModalType: 'video' | 'audio' = 'video';
  codecModalValue = '';
  codecModalLoading = false;
  codecModalItems: CodecMediaItem[] = [];
  codecModalPage = 1;
  codecModalTotalPages = 0;
  codecModalTotal = 0;

  // Chart configurations
  donutChartData: ChartData<'doughnut'> = {
    labels: ['Direct Play', 'Transcode', 'Direct Stream'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
      borderWidth: 0
    }]
  };

  donutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#9ca3af', padding: 16 }
      }
    },
    cutout: '60%'
  };

  lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'Direct Play',
        data: [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Transcodes',
        data: [],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#9ca3af' }
      }
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(75, 85, 99, 0.3)' }
      },
      y: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(75, 85, 99, 0.3)' },
        beginAtZero: true
      }
    }
  };

  reasonsChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: '#ef4444',
      borderRadius: 4
    }]
  };

  reasonsChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(75, 85, 99, 0.3)' }
      },
      y: {
        ticks: { color: '#9ca3af' },
        grid: { display: false }
      }
    }
  };

  deviceChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: '#3b82f6',
      borderRadius: 4
    }]
  };

  deviceChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(75, 85, 99, 0.3)' },
        min: 0,
        max: 100
      },
      y: {
        ticks: { color: '#9ca3af' },
        grid: { display: false }
      }
    }
  };

  constructor(private transcodingService: TranscodingService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadData();
  }

  loadUsers(): void {
    this.transcodingService.getUsers().subscribe({
      next: (users) => this.users = users,
      error: (err) => console.error('Error loading users:', err)
    });
  }

  loadData(): void {
    this.loading = true;
    
    // Load summary and overview data
    Promise.all([
      this.transcodingService.getSummary(this.selectedPeriod, this.selectedUserId).toPromise(),
      this.transcodingService.getDecisionsOverTime(this.selectedPeriod, this.selectedUserId).toPromise(),
      this.transcodingService.getTranscodeReasons(this.selectedPeriod, this.selectedUserId).toPromise(),
      this.transcodingService.getByMedia(this.selectedPeriod, this.selectedUserId, 1, 5).toPromise()
    ]).then(([summary, decisions, reasons, media]) => {
      this.summary = summary || null;
      this.decisionsOverTime = decisions || [];
      this.transcodeReasons = reasons || [];
      this.topMedia = media?.items || [];
      
      this.updateCharts();
      this.loading = false;
    }).catch(err => {
      console.error('Error loading data:', err);
      this.loading = false;
    });

    // Load tab-specific data
    this.loadTabData();
  }

  loadTabData(): void {
    if (this.activeTab === 'devices') {
      this.loadDevices();
    } else if (this.activeTab === 'formats') {
      this.loadFormats();
    } else if (this.activeTab === 'recommendations') {
      this.loadRecommendations();
    }
  }

  loadDevices(): void {
    this.loadingDevices = true;
    this.transcodingService.getByDevice(this.selectedPeriod, this.selectedUserId).subscribe({
      next: (devices) => {
        this.devices = devices;
        this.updateDeviceChart();
        this.loadingDevices = false;
      },
      error: (err) => {
        console.error('Error loading devices:', err);
        this.loadingDevices = false;
      }
    });
  }

  loadFormats(): void {
    this.loadingFormats = true;
    Promise.all([
      this.transcodingService.getByFormat(this.selectedPeriod, this.selectedUserId).toPromise(),
      this.transcodingService.getCombinations(this.selectedPeriod, this.selectedUserId).toPromise()
    ]).then(([formats, combos]) => {
      this.formatData = formats || null;
      this.combinations = combos || [];
      this.loadingFormats = false;
    }).catch(err => {
      console.error('Error loading formats:', err);
      this.loadingFormats = false;
    });
  }

  loadRecommendations(): void {
    this.loadingRecommendations = true;
    this.transcodingService.getRecommendations(this.selectedPeriod, this.selectedUserId).subscribe({
      next: (recs) => {
        this.recommendations = recs;
        this.loadingRecommendations = false;
      },
      error: (err) => {
        console.error('Error loading recommendations:', err);
        this.loadingRecommendations = false;
      }
    });
  }

  updateCharts(): void {
    // Update donut chart
    if (this.summary) {
      this.donutChartData = {
        ...this.donutChartData,
        datasets: [{
          ...this.donutChartData.datasets[0],
          data: [
            this.summary.directPlayCount,
            this.summary.transcodeCount,
            this.summary.directStreamCount
          ]
        }]
      };
    }

    // Update line chart
    if (this.decisionsOverTime.length > 0) {
      this.lineChartData = {
        labels: this.decisionsOverTime.map(d => this.formatDate(d.date)),
        datasets: [
          {
            ...this.lineChartData.datasets[0],
            data: this.decisionsOverTime.map(d => d.directPlay)
          },
          {
            ...this.lineChartData.datasets[1],
            data: this.decisionsOverTime.map(d => d.transcodes)
          }
        ]
      };
    }

    // Update reasons chart
    if (this.transcodeReasons.length > 0) {
      const topReasons = this.transcodeReasons.slice(0, 8);
      this.reasonsChartData = {
        labels: topReasons.map(r => r.label),
        datasets: [{
          ...this.reasonsChartData.datasets[0],
          data: topReasons.map(r => r.count)
        }]
      };
    }
  }

  updateDeviceChart(): void {
    if (this.devices.length > 0) {
      const topDevices = this.devices.slice(0, 10);
      this.deviceChartData = {
        labels: topDevices.map(d => d.name),
        datasets: [{
          ...this.deviceChartData.datasets[0],
          data: topDevices.map(d => d.directPlayRate),
          backgroundColor: topDevices.map(d => 
            d.directPlayRate >= 80 ? '#10b981' : 
            d.directPlayRate >= 50 ? '#f59e0b' : '#ef4444'
          )
        }]
      };
    }
  }

  onTabChange(tab: 'overview' | 'devices' | 'formats' | 'recommendations'): void {
    this.activeTab = tab;
    this.loadTabData();
  }

  onPeriodChange(): void {
    this.loadData();
  }

  onUserChange(): void {
    this.loadData();
  }

  toggleDeviceExpanded(deviceId: string): void {
    if (this.expandedDevices.has(deviceId)) {
      this.expandedDevices.delete(deviceId);
    } else {
      this.expandedDevices.add(deviceId);
    }
  }

  isDeviceExpanded(deviceId: string): boolean {
    return this.expandedDevices.has(deviceId);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatBytes(bytes: number | null | undefined): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  getReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      'videoCodecNotSupported': 'Video Codec',
      'audioCodecNotSupported': 'Audio Codec',
      'containerNotSupported': 'Container',
      'bitrateExceedsLimit': 'Bitrate Limit',
      'subtitleCodecNotSupported': 'Subtitles'
    };
    return labels[reason] || reason || 'Unknown';
  }

  getDirectPlayRateClass(rate: number): string {
    if (rate >= 80) return 'text-green-400';
    if (rate >= 50) return 'text-yellow-400';
    return 'text-red-400';
  }

  getRecommendationTypeClass(type: string): string {
    switch (type) {
      case 'high': return 'border-red-500 bg-red-500/10';
      case 'medium': return 'border-yellow-500 bg-yellow-500/10';
      case 'low': return 'border-blue-500 bg-blue-500/10';
      case 'positive': return 'border-green-500 bg-green-500/10';
      default: return 'border-dark-600';
    }
  }

  getRecommendationBadgeClass(type: string): string {
    switch (type) {
      case 'high': return 'bg-red-500/20 text-red-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-blue-500/20 text-blue-400';
      case 'positive': return 'bg-green-500/20 text-green-400';
      default: return 'bg-dark-600 text-gray-400';
    }
  }

  getPeriodLabel(): string {
    switch (this.selectedPeriod) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case 'all': return 'All Time';
      default: return '';
    }
  }

  // Codec modal methods
  openCodecModal(type: 'video' | 'audio', codecName: string): void {
    this.codecModalType = type;
    this.codecModalValue = codecName;
    this.codecModalPage = 1;
    this.codecModalOpen = true;
    this.loadCodecMedia();
  }

  closeCodecModal(): void {
    this.codecModalOpen = false;
    this.codecModalItems = [];
  }

  loadCodecMedia(): void {
    this.codecModalLoading = true;
    this.transcodingService.getMediaByCodec(
      this.codecModalType,
      this.codecModalValue,
      this.selectedPeriod,
      this.selectedUserId,
      this.codecModalPage,
      20
    ).subscribe({
      next: (response) => {
        this.codecModalItems = response.items;
        this.codecModalTotalPages = response.pagination.totalPages;
        this.codecModalTotal = response.pagination.total;
        this.codecModalLoading = false;
      },
      error: (err) => {
        console.error('Error loading codec media:', err);
        this.codecModalLoading = false;
      }
    });
  }

  codecModalNextPage(): void {
    if (this.codecModalPage < this.codecModalTotalPages) {
      this.codecModalPage++;
      this.loadCodecMedia();
    }
  }

  codecModalPrevPage(): void {
    if (this.codecModalPage > 1) {
      this.codecModalPage--;
      this.loadCodecMedia();
    }
  }

  getMediaTitle(item: CodecMediaItem): string {
    if (item.mediaType === 'episode' && item.showTitle) {
      return `${item.showTitle} - S${item.seasonNumber?.toString().padStart(2, '0')}E${item.episodeNumber?.toString().padStart(2, '0')}`;
    }
    return item.title + (item.year ? ` (${item.year})` : '');
  }
}
