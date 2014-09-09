# Copyright 2010-2012 RethinkDB, all rights reserved.
# Namespace view

module 'TableView', ->
    class @TableContainer extends Backbone.View
        template:
            not_found: Handlebars.templates['element_view-not_found-template']
            loading: Handlebars.templates['loading-template']
            error: Handlebars.templates['error-query-template']
        className: 'table-view'
        initialize: (id) =>
            @loading = true
            @id = id

            @model = null
            @indexes = null
            @distribution = null
            @table_view = null

            @fetch_data()
            @interval = setInterval @fetch_data, 5000


        fetch_data: =>
            #TODO Use table_config to retrieve the number of shards/replicas
            ignore = (shard) -> shard('role').ne('nothing')
            this_id = @id
            query =
                r.db(system_db).table('server_config').count().do( (num_servers) ->
                    r.db(system_db).table('table_status').get(this_id).do( (table) ->
                        r.branch(
                            table.eq(null),
                            null,
                            table.merge(
                                num_shards: table("shards").count()
                                num_available_shards: table("shards").concatMap( (shard) -> shard ).filter({role: "director", state: "ready"}).count()
                                num_replicas: table("shards").concatMap( (shard) -> shard ).filter(ignore).count()
                                num_replicas: table("shards").concatMap( (shard) -> shard ).filter(ignore).count()
                                num_available_replicas: table("shards").concatMap( (shard) -> shard ).filter(ignore).filter({state: "ready"}).count()
                                max_replicas: num_servers
                                num_replicas_per_shard: table("shards").nth(0).filter(ignore).count()
                                distribution: table('shards').indexesOf( () -> true ).map( (position) -> #TODO: Replace with the real API
                                    num_keys: r.random(0, 300000).add(800000)
                                    id: position
                                )
                                shards_assignments: r.db(system_db).table('table_config').get(this_id)("shards").indexesOf( () -> true ).map (position) ->
                                    id: position
                                    director:
                                        id: r.db(system_db).table('server_config').filter({name: r.db(system_db).table('table_config').get(this_id)("shards").nth(position)("directors").nth(0)}).nth(0)("uuid")
                                        name: r.db(system_db).table('table_config').get(this_id)("shards").nth(position)("directors").nth(0)
                                    replicas: r.db(system_db).table('table_config').get(this_id)("shards").nth(position)("replicas").filter( (replica) ->
                                        replica.ne(r.db(system_db).table('table_config').get(this_id)("shards").nth(position)("directors").nth(0))
                                    ).map (name) ->
                                        id: r.db(system_db).table('server_config').filter({name: name}).nth(0)("uuid")
                                        name: name

                            ).do( (table) ->
                                r.branch( # We must be sure that the table is ready before retrieving the indexes
                                    table("num_available_shards").eq(table("num_shards")), #TODO Is that a sufficient condition?
                                    table.merge({
                                        indexes: r.db(table("db")).table(table("name")).indexStatus()
                                            .pluck('index', 'ready', 'blocks_processed', 'blocks_total')
                                            .merge( (index) -> {
                                                id: index("index")
                                                db: table("db")
                                                table: table("name")
                                            }) # add an id for backbone
                                    }),
                                    table.merge({indexes: null})
                                )
                            )
                        )
                    )
                ).without('shards')

            driver.run query, (error, result) =>
                ###
                console.log '---- err, result -----'
                console.log error
                console.log JSON.stringify(result, null, 2)
                ###
                if error?
                    # TODO: We may want to render only if we failed to open a connection
                    @error = error
                    @render()
                else
                    @error = null
                    if result is null
                        if @loading is true
                            @loading = false
                            @render()
                        else if @model isnt null
                            @model = null
                            @indexes = null
                            @table_view = null
                            @render()
                    else
                        if not @model?
                            if result.indexes isnt null
                                @indexes = new Indexes _.map result.indexes, (index) -> new Index index
                                delete result.indexes

                            @distribution = new Distribution _.map result.distribution, (shard) -> new Shard shard
                            delete result.distribution


                            # Flatten all shards assignments because it's less work than handling nested collections
                            shards_assignments = []
                            for shard in result.shards_assignments
                                shards_assignments.push
                                    id: "start_shard_#{shard.id}"
                                    shard_id: shard.id
                                    start_shard: true

                                shards_assignments.push
                                    id: "shard_director_#{shard.id}"
                                    director: true
                                    shard_id: shard.id
                                    data: shard.director

                                for replica, position in shard.replicas
                                    shards_assignments.push
                                        id: "shard_replica_#{shard.id}_#{position}"
                                        replica: true
                                        replica_position: position
                                        shard_id: shard.id
                                        data: replica

                                shards_assignments.push
                                    id: "end_shard_#{shard.id}"
                                    shard_id: shard.id
                                    end_shard: true


                            @shards_assignments = new ShardAssignments _.map shards_assignments, (shard) ->
                                new ShardAssignment shard
                            delete result.shards_assignments

                            @model = new Table result
                            @table_view = new TableView.TableMainView
                                model: @model
                                indexes: @indexes
                                distribution: @distribution
                                shards_assignments: @shards_assignments
                        else # @model is defined
                            if result.indexes isnt null
                                if @indexes?
                                    @indexes.set _.map result.indexes, (index) -> new Index index
                                else
                                    @indexes = new Indexes _.map result.indexes, (index) -> new Index index
                                    @table_view.set_indexes @indexes
                                delete result.indexes

                            @distribution.set _.map result.distribution, (shard) -> new Shard shard
                            @distribution.trigger 'update'
                            delete result.distrubtion

                            shards_assignments = []
                            for shard in result.shards_assignments
                                shards_assignments.push
                                    id: "start_shard_#{shard.id}"
                                    shard_id: shard.id
                                    start_shard: true

                                shards_assignments.push
                                    id: "shard_director_#{shard.id}"
                                    director: true
                                    shard_id: shard.id
                                    data: shard

                                for replica, position in shard.replicas
                                    shards_assignments.push
                                        id: "shard_replica_#{shard.id}_#{position}"
                                        replica: true
                                        replica_position: position
                                        shard_id: shard.id
                                        data: replica

                            @shards_assignments.set _.map shards_assignments, (shard) -> new ShardAssignment shard
                            delete result.shards_assignments

                            @model.set result

                        if @loading is true
                            @loading = false
                            @render()

        render: =>
            if @error?
                @$el.html @template.error
                    error: @error?.message
                    url: '#tables/'+@id
            else if @loading is true
                @$el.html @template.loading()
            else
                if @table_view?
                    @$el.html @table_view.render().$el
                else # In this case, the query returned null, so the table was not found
                    @$el.html @template.not_found
                        id: @id
                        type: 'table'
                        type_url: 'tables'
                        type_all_url: 'tables'
            @

    class @TableMainView extends Backbone.View
        className: 'namespace-view'
        template:
            main: Handlebars.templates['namespace_view-container-template']
            alert: Handlebars.templates['modify_shards-alert-template']

        events: ->
            'click .close': 'close_alert'
            'click .change_shards-link': 'change_shards'
            # operations in the dropdown menu
            'click .operations .rename': 'rename_namespace'
            'click .operations .delete': 'delete_namespace'


        initialize: (data, options) =>
            @indexes = data.indexes
            @distribution = data.distribution
            @shards_assignments = data.shards_assignments

            #TODO Load distribution

            # Panels for namespace view
            @title = new TableView.Title
                model: @model
            @profile = new TableView.Profile
                model: @model
            @secondary_indexes_view = new TableView.SecondaryIndexesView
                collection: @indexes
                model: @model
            @replicas = new TableView.Replicas
                model: @model
            @shards = new TableView.Sharding
                collection: @distribution
                model: @model
            @server_assignments = new TableView.ShardAssignmentsView
                model: @model
                collection: @shards_assignments
            ###
            @performance_graph = new Vis.OpsPlot(@model.get_stats_for_performance,
                width:  564             # width in pixels
                height: 210             # height in pixels
                seconds: 73             # num seconds to track
                type: 'table'
            )
            ###

        render: =>
            @$el.html @template.main
                namespace_id: @model.get 'id'

            # fill the title of this page
            @$('.main_title').html @title.render().$el

            # Add the replica and shards views
            @$('.profile').html @profile.render().$el

            ###
            @.$('.performance-graph').html @performance_graph.render().$el
            ###

            # Display the replicas
            @$('.replication').html @replicas.render().el

            # Display the shards
            @$('.sharding').html @shards.render().el

            # Display the server assignments
            @$('.server-assignments').html @server_assignments.render().el

            # Display the secondary indexes
            @$('.secondary_indexes').html @secondary_indexes_view.render().el


            return @

        close_alert: (event) ->
            event.preventDefault()
            $(event.currentTarget).parent().slideUp('fast', -> $(this).remove())

        change_shards: (event) =>
            event.preventDefault()
            @.$('#namespace-sharding-link').tab('show')

        change_pinning: (event) =>
            event.preventDefault()
            @.$('#namespace-pinning-link').tab('show')
            $(event.currentTarget).parent().parent().slideUp('fast', -> $(this).remove())

        # Rename operation
        rename_namespace: (event) =>
            event.preventDefault()
            rename_modal = new UIComponents.RenameItemModal @model.get('id'), 'table'
            rename_modal.render()

        # Delete operation
        delete_namespace: (event) ->
            event.preventDefault()
            if @remove_namespace_dialog
                @remove_namespace_dialog.remove()
            @remove_namespace_dialog = new Modals.RemoveNamespaceModal

            @remove_namespace_dialog.render [{
                table: @model.get 'name'
                database: @model.get 'db'
            }]


        destroy: =>
            clearInterval @interval

            @title.remove()
            @profile.remove()
            @replicas.remove()
            @shards.remove()
            @server_assignments.remove()
            @performance_graph.remove()
            @secondary_indexes_view.remove()

            if @remove_namespace_dialog
                @remove_namespace_dialog.remove()

    # TableView.Title
    class @Title extends Backbone.View
        className: 'namespace-info-view'
        template: Handlebars.templates['table_title-template']
        initialize: ->
            @listenTo @model, 'change:name', @render

        render: =>
            @.$el.html @template
                name: @model.get 'name'
                db: @model.get 'db'
            @

        destroy: =>
            @stopListening()

    # Profile view
    class @Profile extends Backbone.View
        className: 'namespace-profile'
        template: Handlebars.templates['table_profile-template']

        initialize: ->
            @listenTo @model, 'change', @render

        render: =>
            @$el.html @template
                status: @model.get 'ready_completely'
                total_keys: "TODO"
                num_shards: @model.get 'num_shards'
                num_available_shards: @model.get 'num_available_shards'
                num_replicas: @model.get 'num_replicas'
                num_available_replicas: @model.get 'num_available_replicas'
            return @

        destroy: =>
            @stopListening()

    class @SecondaryIndexesView extends Backbone.View
        template: Handlebars.templates['namespace_view-secondary_indexes-template']
        alert_message_template: Handlebars.templates['secondary_indexes-alert_msg-template']
        error_template: Handlebars.templates['secondary_indexes-error-template']
        events:
            'click .create_link': 'show_add_index'
            'click .create_btn': 'create_index'
            'keydown .new_index_name': 'handle_keypress'
            'click .cancel_btn': 'hide_add_index'
            'click .reconnect_link': 'init_connection'
            'click .close_hide': 'hide_alert'
        error_interval: 5*1000 # In case of an error, we try to retrieve the secondary index in 5 seconds
        normal_interval: 10*1000 # Retrieve secondary indexes every 10 seconds
        short_interval: 1000 # Interval when an index is being created

        initialize: (data) =>
            @indexes_view = []
            @interval_progress = null

            @collection = data.collection
            @model = data.model

            @adding_index = false

            if @collection?
                @loading = false
                @hook()
            else
                @loading = true
                @$el.html @template
                    loading: @loading
                    adding_index: @adding_index

        set_fetch_progress: (index) =>
            if not @interval_progress?
                @fetch_progress()
                @interval_progress = setInterval @fetch_progress, 1000


        fetch_progress: =>
            if not @model.get('db')?
                debugger
            if not @model.get('name')?
                debugger

            fetch_for_progress = []
            for index in @collection.models
                if index.get('ready') isnt true
                    fetch_for_progress.push index.get 'index'

            if fetch_for_progress.length > 0
                query = r.db(@model.get('db')).table(@model.get('name')).indexStatus(r.args(fetch_for_progress))
                    .pluck('index', 'ready', 'blocks_processed', 'blocks_total')
                    .merge( (index) => {
                        id: index("index")
                        db: @model.get("db")
                        table: @model.get("name")
                    })

                driver.run query, (error, result) =>
                    if error?
                        # This can happen if the table is temporary unavailable. We log the error, and ignore it
                        console.log "Nothing bad - Could not fetch secondary indexes statuses"
                        console.log error
                    else
                        all_ready = true
                        for index in result
                            if index.ready isnt true
                                all_ready = false
                            @collection.add new Index index, {merge: true}
                        if all_ready is true
                            clearInterval @interval_progress
                            @interval_progress = null
            else
                clearInterval @interval_progress
                @interval_progress = null


        set_indexes: (indexes) =>
            @collection = indexes
            @hook()

        hook: =>
            @$el.html @template
                loading: @loading
                adding_index: @adding_index

            @loading = false

            @collection.each (index) =>
                view = new TableView.SecondaryIndexView
                    model: index
                    container: @
                # The first time, the collection is sorted
                @indexes_view.push view
                @$('.list_secondary_indexes').append view.render().$el
            if @collection.length isnt 0
                @$('.no_index').hide()

            @collection.on 'add', (index) =>
                view = new TableView.SecondaryIndexView
                    model: index
                    container: @
                @indexes_view.push view

                position = @collection.indexOf index
                if @collection.length is 1
                    @$('.list_secondary_indexes').html view.render().$el
                else if position is 0
                    @$('.list_secondary_indexes').prepend view.render().$el
                else
                    @$('.index_container').eq(position-1).after view.render().$el

                @$('.no_index').hide()

            @collection.on 'remove', (index) =>
                for view in @indexes_view
                    if view.model is index
                        index.destroy()
                        ((view) ->
                            view.$el.slideUp 'fast', =>
                                view.remove()
                        )(view)
                        break
                if @collection.length is 0
                    @$('.no_index').show()

        render_error: (args) =>
            @$('.alert_error_content').html @error_template args
            @$('.main_alert_error').slideDown 'fast'
            @$('.main_alert').slideUp 'fast'

        render_feedback: (args) =>
            if @$('.main_alert').css('display') is 'none'
                @$('.alert_content').html @alert_message_template args
                @$('.main_alert').slideDown 'fast'
            else
                @$('.main_alert').fadeOut 'fast', =>
                    @$('.alert_content').html @alert_message_template args
                    @$('.main_alert').fadeIn 'fast'
            @$('.main_alert_error').slideUp 'fast'

        render: =>
            return @

        # Show the form to add a secondary index
        show_add_index: (event) =>
            event.preventDefault()
            @$('.add_index_li').slideDown 'fast'
            @$('.create_container').slideUp 'fast'
            @$('.new_index_name').focus()
        
        # Hide the form to add a secondary index
        hide_add_index: =>
            @$('.add_index_li').slideUp 'fast'
            @$('.create_container').slideDown 'fast'
            @$('.new_index_name').val ''

        # We catch enter and esc when the user is writing a secondary index name
        handle_keypress: (event) =>
            if event.which is 13 # Enter
                event.preventDefault()
                @create_index()
            else if event.which is 27 # ESC
                event.preventDefault()
                @hide_add_index()
       
        on_fail_to_connect: =>
            @loading = false
            @render_error
                connect_fail: true
            return @

        create_index: =>
            @$('.create_btn').prop 'disabled', 'disabled'
            @$('.cancel_btn').prop 'disabled', 'disabled'

            index_name = @$('.new_index_name').val()
            ((index_name) =>
                query = r.db(@model.get('db')).table(@model.get('name')).indexCreate(index_name)
                driver.run query, (error, result) =>
                    @$('.create_btn').prop 'disabled', false
                    @$('.cancel_btn').prop 'disabled', false
                    that = @
                    if error?
                        @render_error
                            create_fail: true
                            message: error.msg.replace('\n', '<br/>')
                    else
                        @collection.add new Index
                            id: index_name
                            index: index_name
                            db: @model.get 'db'
                            table: @model.get 'name'
                        @render_feedback
                            create_ok: true
                            name: index_name

                        @hide_add_index()
            )(index_name)

        # Hide alert BUT do not remove it
        hide_alert: (event) ->
            if event? and @$(event.target)?.data('name')?
                @deleting_secondary_index = null
            event.preventDefault()
            $(event.target).parent().slideUp 'fast'
        
        destroy: =>
            if @timeout?
                clearTimeout @timeout
            @db.off 'change:name', @update_info
            @model.off 'change:name', @update_info
            for key, view of @indexes
                view.destroy()

    class @SecondaryIndexView extends Backbone.View
        template: Handlebars.templates['namespace_view-secondary_index-template']
        progress_template: Handlebars.templates['simple_progressbar-template']
        events:
            'click .delete_link': 'confirm_delete'
            'click .delete_index_btn': 'delete_index'
            'click .cancel_delete_btn': 'cancel_delete'

        tagName: 'li'
        className: 'index_container'

        initialize: (data) =>
            @container = data.container

            @model.on 'change:blocks_processed', @update
            @model.on 'change:ready', @update

        update: (args) =>
            if @model.get('ready') is false
                @render_progress_bar()
            else
                if @progress_bar?
                    @render_progress_bar()
                else
                    @render()

        render: =>
            @$el.html @template
                is_empty: @model.get('name') is ''
                name: @model.get 'index'
                ready: @model.get 'ready'

            if @model.get('ready') is false
                @render_progress_bar()
                @container.set_fetch_progress()
            @

        render_progress_bar: =>
            blocks_processed = @model.get 'blocks_processed'
            blocks_total = @model.get 'blocks_total'

            if @progress_bar?
                if @model.get('ready') is true
                    @progress_bar.render 100, 100,
                        got_response: true
                        check: true
                        , => @render()
                else
                    @progress_bar.render blocks_processed, blocks_total,
                        got_response: true
                        check: true
                        , => @render()
            else
                @progress_bar = new UIComponents.OperationProgressBar @progress_template
                @$('.progress_li').html @progress_bar.render(0, Infinity, {new_value: true, check: true}).$el

        # Show a confirmation before deleting a secondary index
        confirm_delete: (event) =>
            event.preventDefault()
            @$('.alert_confirm_delete').slideDown 'fast'

        delete_index: =>
            @$('.btn').prop 'disabled', 'disabled'
            query = r.db(@model.get('db')).table(@model.get('table')).indexDrop(@model.get('index'))
            driver.run query, (error, result) =>
                if error?
                    @container.render_error
                        delete_fail: true
                        message: error.msg.replace('\n', '<br/>')
                else if result.dropped is 1
                    @container.render_feedback
                        delete_ok: true
                        name: @model.get('index')
                    @model.destroy()
                else
                    @container.render_error
                        delete_fail: true
                        message: "Result was not {dropped: 1}"

        # Close to hide_alert, but the way to reach the alert is slightly different than with the x link
        cancel_delete: ->
            @$('.alert_confirm_delete').slideUp 'fast'

        remove: =>
            if @progress_bar?
                @progress_bar.destroy()
            super()
