import ResourceDetailPage from '@/components/shared/ResourceDetailPage'

export default function StorageClassDetail() {
  return <ResourceDetailPage config={{
    title: 'StorageClass',
    nameParam: 'scName',
    detailApi: '/mrboard/storageclass/v1/Detail',
    yamlApi: '/mrboard/storageclass/v1/Yaml',
    backPath: '/k8s/storageclass',
    infoFields: [
      ['名称', 'name', '供给者', 'provisioner'],
      ['回收策略', 'reclaimPolicy', '绑定模式', 'volumeBindingMode'],
      ['允许扩展', 'allowVolumeExpansion', '创建时间', 'createTime'],
    ],
  }} />
}
